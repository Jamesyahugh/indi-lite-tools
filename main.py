#!/usr/bin/python3
from flask import Flask, render_template, g, request, session, Response
from flask.json import jsonify
from indicontroller import INDIController
from time import sleep
import queue
import logging
import pprint
import threading
import json

app = Flask(__name__)
app.config['bootstrap_version']='3.3.7'
app.config['jquery_version']='3.1.1'

subscriptions = []

def controller():
    # if 'controller' not in app.config:
    #     app.config['controller'] = INDIController()
    # return app.config['controller']
    return INDIController(app.static_folder)

def logger():
    logger = logging.getLogger('indi-preview')
    logger.setLevel(logging.DEBUG)
    return logger

def put_event(evt):
    for s in subscriptions:
        s.put(evt)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/devices')
def devices():
    return jsonify(controller().devices())

@app.route('/device/<devicename>/properties')
def properties(devicename):
    return jsonify(controller().properties(devicename))

@app.route('/device/<devicename>/properties/<property>')
def property(devicename, property):
    return jsonify(controller().property(devicename, property))

@app.route('/device/<devicename>/properties/<property>', methods=['PUT'])
def set_property(devicename, property):
    return jsonify(controller().set_property(devicename, property, request.form['value']))

def image_path(file):
    return '/'.join([app.static_url_path, file]) 

def image_event(name, type):
    put_event({'type': type, 'url': image_path( name )})

@app.route('/device/<devicename>/preview/<exposure>')
def preview(devicename, exposure):
    def exp():
        image = controller().preview(devicename, float(exposure) )
        image_event(image[0], 'image')
        image_event(image[1], 'histogram')
    t = threading.Thread(target = exp)
    t.start()
    return ('', 204)

@app.route('/device/<devicename>/framing/<exposure>')
def framing(devicename, exposure):
    def exp():
        while(app.config['framing']):
            image = controller().preview(devicename, float(exposure) )
            image_event(image[0], 'image')
            image_event(image[1], 'histogram')
    app.config['framing'] = exposure != 'stop'
    if app.config['framing']:
        t = threading.Thread(target = exp)
        t.start()
    return('', 204)

@app.route('/events')
def events():
    def gen():
        q = queue.Queue()
        subscriptions.append(q)
        while(True):
            data = q.get()
            print("sending event...")
            yield("data: {0}\n\n".format(json.dumps(data)))
    return Response(gen(), mimetype="text/event-stream")



app.secret_key = b'\xcc\xfc\xbe6^\x9a\xbf>\xbc\xaa\x9e\xe8\xa6\n7'


if __name__ == '__main__':
    app.run(threaded=True, host="0.0.0.0")


# vim: set tabstop=4 shiftwidth=4 expandtab
