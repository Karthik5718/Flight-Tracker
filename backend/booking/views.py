import json
import re
from datetime import datetime
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from booking.services import ignav
from core.cache import get_cached_or_fetch

DATE_RE = re.compile(r'^\d{4}-\d{2}-\d{2}$')
CABINS = {'economy', 'premium_economy', 'business', 'first'}


def _validate_search(data, round_trip=False):
    origin = (data.get('origin') or '').strip().upper()
    destination = (data.get('destination') or '').strip().upper()
    departure_date = (data.get('departure_date') or '').strip()
    if not origin or not destination:
        return None, 'origin and destination are required (IATA codes)'
    if not departure_date or not DATE_RE.match(departure_date):
        return None, 'departure_date is required (YYYY-MM-DD)'
    try:
        dep = datetime.strptime(departure_date, '%Y-%m-%d').date()
    except ValueError:
        return None, 'departure_date is invalid'
    payload = {
        'origin': origin,
        'destination': destination,
        'departure_date': departure_date,
    }
    if round_trip:
        return_date = (data.get('return_date') or '').strip()
        if not return_date or not DATE_RE.match(return_date):
            return None, 'return_date is required (YYYY-MM-DD)'
        try:
            ret = datetime.strptime(return_date, '%Y-%m-%d').date()
        except ValueError:
            return None, 'return_date is invalid'
        if ret < dep:
            return None, 'return_date must be on or after departure_date'
        payload['return_date'] = return_date

    for int_field in ('adults', 'children', 'infants_in_seat', 'infants_on_lap', 'max_stops',
                      'min_carry_on_bags', 'min_checked_bags', 'max_price'):
        if data.get(int_field) is not None and data.get(int_field) != '':
            try:
                payload[int_field] = int(data[int_field])
            except (ValueError, TypeError):
                return None, f'{int_field} must be an integer'
    if data.get('cabin_class'):
        cabin = str(data['cabin_class']).strip().lower()
        if cabin not in CABINS:
            return None, 'cabin_class must be economy, premium_economy, business or first'
        payload['cabin_class'] = cabin
    if data.get('market'):
        payload['market'] = str(data['market']).strip().upper()[:2]
    for list_field in ('airlines_include', 'airlines_exclude'):
        if data.get(list_field):
            vals = data[list_field]
            if isinstance(vals, str):
                vals = [v.strip().upper() for v in vals.split(',') if v.strip()]
            payload[list_field] = vals
    if isinstance(data.get('departure_time_range'), dict):
        payload['departure_time_range'] = data['departure_time_range']
    if isinstance(data.get('return_time_range'), dict):
        payload['return_time_range'] = data['return_time_range']
    if data.get('allow_self_transfer') is not None:
        payload['allow_self_transfer'] = bool(data['allow_self_transfer'])
    return payload, None


class BookingOneWaySearchView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        payload, err = _validate_search(request.data or {}, round_trip=False)
        if err:
            return Response({'error': err}, status=400)
        cache_key = 'ignav_oneway_' + json.dumps(payload, sort_keys=True)
        data = get_cached_or_fetch(
            cache_key,
            lambda: _fetch_or_none(lambda: ignav.search_one_way(payload)),
            600,
        )
        if data is None:
            return Response({'error': getattr(_fetch_or_none, 'last_error', 'Fares search failed')}, status=502)
        return Response(data)


class BookingRoundTripSearchView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        payload, err = _validate_search(request.data or {}, round_trip=True)
        if err:
            return Response({'error': err}, status=400)
        cache_key = 'ignav_roundtrip_' + json.dumps(payload, sort_keys=True)
        data = get_cached_or_fetch(
            cache_key,
            lambda: _fetch_or_none(lambda: ignav.search_round_trip(payload)),
            600,
        )
        if data is None:
            return Response({'error': getattr(_fetch_or_none, 'last_error', 'Fares search failed')}, status=502)
        return Response(data)


class BookingLinksView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        data = request.data or {}
        if data.get('ignav_id'):
            payload = {'ignav_id': str(data['ignav_id']).strip()}
        else:
            required = ('origin', 'destination', 'departure_date',
                        'outbound_carrier_code', 'outbound_flight_number')
            missing = [f for f in required if not (data.get(f) or '').__str__().strip()]
            if missing:
                return Response(
                    {'error': f"ignav_id or full flight details required (missing: {', '.join(missing)})"},
                    status=400,
                )
            payload = {
                'origin': str(data['origin']).strip().upper(),
                'destination': str(data['destination']).strip().upper(),
                'departure_date': str(data['departure_date']).strip(),
                'outbound_carrier_code': str(data['outbound_carrier_code']).strip().upper(),
                'outbound_flight_number': str(data['outbound_flight_number']).strip(),
            }
            for opt in ('return_date', 'inbound_carrier_code', 'inbound_flight_number', 'market'):
                if data.get(opt):
                    v = str(data[opt]).strip()
                    payload[opt] = v.upper() if opt in ('inbound_carrier_code', 'market') else v
            for int_field in ('adults', 'children', 'infants_in_seat', 'infants_on_lap'):
                if data.get(int_field) is not None and data.get(int_field) != '':
                    try:
                        payload[int_field] = int(data[int_field])
                    except (ValueError, TypeError):
                        return Response({'error': f'{int_field} must be an integer'}, status=400)
        result, error, status = ignav.get_booking_links(payload)
        if error:
            return Response({'error': error}, status=status)
        return Response(result)


class BookingAirportSearchView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        q = (request.GET.get('q') or '').strip()
        if len(q) < 2:
            return Response({'error': 'q must be at least 2 characters'}, status=400)
        try:
            limit = int(request.GET.get('limit', 10))
        except (ValueError, TypeError):
            limit = 10
        limit = max(1, min(limit, 20))
        data = get_cached_or_fetch(
            f'ignav_airports_{q.lower()}_{limit}',
            lambda: _fetch_or_none(lambda: ignav.search_airports(q, limit)),
            3600,
        )
        if data is None:
            return Response({'error': 'Airport search failed'}, status=502)
        if isinstance(data, dict) and 'results' in data:
            return Response(data['results'])
        return Response(data)


def _fetch_or_none(fn):
    data, error, _status = fn()
    if error:
        _fetch_or_none.last_error = error
        return None
    return data
