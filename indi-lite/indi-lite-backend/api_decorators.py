from flask import jsonify, request
from api_utils import *
from functools import wraps
import time

def json_api(f):
    @wraps(f)
    def f_wrapper(*args, **kwargs):
        try:
            return jsonify(f(*args, **kwargs))
        except NotFoundError as e:
            return api_not_found_error(e.message)
    return f_wrapper


def json_input(f):
    @wraps(f)
    def f_wrapper(*args, **kwargs):
        if not request.is_json:
            return api_bad_json_error()
        kwargs['json'] = request.json
        try:
            return f(*args, **kwargs)
        except BadRequestError as e:
            return api_bad_json_error(e.message)
    return f_wrapper


def timeout(seconds, interval=0.1):
    def decorator(f):
        @wraps(f)
        def f_wrapper(*args, **kwargs):
            started = time.time()
            while time.time() - started < seconds:
                if f(*args, **kwargs):
                    return True
                time.sleep(interval)
            return False
        return f_wrapper
    return decorator

