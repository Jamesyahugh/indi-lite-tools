

var SETTING_EXPOSURE='setting_exposure';
var SETTING_DEVICE='setting_device';
var SETTING_HISTOGRAM_BINS='setting_histogram_bins';
var SETTING_HISTOGRAM_LOG='setting_histogram_log';
var SETTING_RUN_COMMAND='setting_run_command';

var get_setting = function(key, default_value) {
    var value = localStorage.getItem(key);
    return value == null ? default_value : value;
}




var set_image_url = function(basename, url) {
    $('#' + basename + '-image').attr('src', url);
    $('#' + basename + '-container').show();
};

var notification = function(level, title, message, timeout, additional_class) {
    if(additional_class === undefined)
        additional_class = '';
    var notification_id = 'notification-' + new Date().getTime();
    $('.notifications').append(
        '<div id="' + notification_id + '" class="alert alert-' + level + ' ' + additional_class + 
        ' alert-dismissible fade in"><button type="button" class="close" data-dismiss="alert"><span>×</span></button><strong>' +
        title + '</strong> ' + message + '</div>');
    if(timeout > 0) {
        window.setTimeout(function() { $('#' + notification_id).alert('close'); }, timeout * 1000);
    }
};

var events_listener = new EventSource('/events');
events_listener.onmessage = function(e) {
    event = JSON.parse(e.data);
    if(event['type'] == 'image') {
        set_image_url('ccd-preview', event['image_url']);
        set_image_url('histogram', event['histogram']);
        $('.image-received-notification').remove();
        notification('success', 'image received', event['image_id'], 5, 'image-received-notification')
    }
    if(event['type'] == 'notification') {
        notification(event['level'], event['title'], event['message'], -1)
    }
};

$('#ccd-preview-image').click(function() {
    $('#ccd-preview-image').toggleClass('img-responsive');
});

$('#histogram-image').click(function() {
    $('#histogram-image').toggleClass('img-responsive');
});


var current_device = function() {
    return $('#device').val();
};

var current_property = function() {
    return $('#setting').val();
};


var select_callback = function(dom_element, transform, data) {
    data.map(transform).forEach(function(element) {
        dom_element.append($('<option />').val(element.value).text(element.text));
    });
};

var refresh_select = function(select_name, url, transform) {
    refresh_element(select_name, url, select_callback.bind(this, select_name, transform));
};

var refresh_element = function(name, url, on_success) {
    $('#' + name).empty();
    $.ajax(url, {success: on_success.bind(this, $('#' + name)) });
};

var refresh_devices = function() {
    $('#setting').empty();
    $('#setting-value').val(null);
    refresh_element('device', '/devices', function(select, data) {
        select_callback(select, function(x) {return {text: x, value: x}; }, data['devices']);
        if(data['devices'].length > 0) {
            $('#device').val(get_setting(SETTING_DEVICE, data['devices'][0]));
        }
        refresh_settings();
    });
};

var get_properties_url = function() {
    return ['/device', current_device(), 'properties'].join('/');
};

var get_setting_url = function() {
    return ['/device', current_device(), 'properties', current_property()].join('/')
};

var refresh_settings = function() {
    $('#setting-value').val(null);
    refresh_element('setting', get_properties_url(), function(select, data) {
        select_callback(select, function(x) {
            property_element = [x['property'], x['element']].join('.');
            return { text: property_element, value: property_element };
        }, data['properties']);
        refresh_value();
    });
};


var refresh_value = function() {
    refresh_element('setting-value', get_setting_url(), function(txt, d) {
        $('#setting-value').val(d['value']);
    });
};

var set_value = function() {
    value = $('#setting-value').val();
    $('#setting-value').val(null);
    $.ajax(get_setting_url(), {method: 'PUT', data: {value: value}, success: refresh_settings});
};

var preview = function() {
    localStorage.setItem(SETTING_EXPOSURE, $('#exposure').val());
    $.ajax('/device/' + current_device() + '/preview/' + $('#exposure').val());
};

var framing = function() {
    localStorage.setItem(SETTING_EXPOSURE, $('#exposure').val());
    $.ajax('/device/' + current_device() + '/framing/' + $('#exposure').val());
    $('#framing').hide();
    $('#stop-framing').show();
};

var stop_framing = function() {
    $.ajax('/device/' + current_device() + '/framing/stop');
    $('#framing').show();
    $('#stop-framing').hide();
}


var nav = function(name) {
    $('.navlink').removeClass('active');
    $('#nav-' + name).addClass('active');
};

var update_histogram_settings = function() {
    var bins = parseInt($('#histogram-bins').val());
    var logarithmic = $('#histogram-logarithmic').prop('checked')
    localStorage.setItem(SETTING_HISTOGRAM_BINS, bins);
    localStorage.setItem(SETTING_HISTOGRAM_LOG, logarithmic);
    $.ajax('/histogram', {method: 'PUT', data: {bins: bins, logarithmic: logarithmic} });
};

//$('#nav-ccd-settings a').click(nav.bind(this, 'ccd-settings'));
//$('#nav-ccd-image a').click(nav.bind(this, 'ccd-image'));

$('#refresh-devices').click(refresh_devices);
$('#refresh-settings').click(refresh_settings);
$('#reset-value').click(refresh_value);
$('#set-value').click(set_value);
$('#preview').click(preview);
$('#framing').click(framing);
$('#stop-framing').click(stop_framing);
$('#histogram-update-settings').click(update_histogram_settings);

$('#device').change(function() {
    localStorage.setItem(SETTING_DEVICE, current_device());
    refresh_settings();
});
$('#setting').change(refresh_value);


var run_command = function() {
    var command = $('#run-command').val();
    localStorage.setItem(SETTING_RUN_COMMAND, command);
    $.ajax('/run_command', {method: 'POST', data: {command: command}});
};

$('#exposure').val(get_setting(SETTING_EXPOSURE, 1));
$('#histogram-bins').val(get_setting(SETTING_HISTOGRAM_BINS, 256));
$('#histogram-logarithmic').prop('checked', get_setting(SETTING_HISTOGRAM_LOG, 'true') == 'true');
$('#shutdown-server').click(function() { $.ajax('/shutdown', {success: function(){ notification('danger', 'Shutdown', 'Server is shutting down...'); }}); });
update_histogram_settings();
$('#run-command-btn').click(run_command);

$('#run-command').val(get_setting(SETTING_RUN_COMMAND), '');

$('#stop-framing').hide();
refresh_devices();
