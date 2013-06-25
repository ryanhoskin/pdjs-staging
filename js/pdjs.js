// Generated by CoffeeScript 1.6.3
(function() {
  var PDJSobj, PDJStools,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  PDJSobj = (function() {
    function PDJSobj() {
      this.update_things = __bind(this.update_things, this);
      this.attach_things = __bind(this.attach_things, this);
    }

    PDJSobj.version = 0.2;

    PDJSobj.server = 'pagerduty.dev';

    PDJSobj.protocol = "http";

    PDJSobj.prototype.set_token = function(token) {
      return this.token = token;
    };

    PDJSobj.prototype.set_subdomain = function(subdomain) {
      return this.subdomain = subdomain;
    };

    PDJSobj.prototype.update_service_incidents = function(service_id) {
      var params, since_date, until_date;
      until_date = new Date();
      since_date = new Date(until_date.getTime() - 90 * PDJStools.SECONDS_IN_A_DAY);
      params = {
        url: "https://" + this.subdomain + ".pagerduty.com/api/v1/incidents",
        type: "GET",
        headers: {
          Authorization: 'Token token=' + this.token
        },
        data: {
          status: "resolved",
          service: service_id,
          sort_by: 'created_on:desc',
          "since": since_date.toISOString(),
          "until": until_date.toISOString()
        },
        success: function(json) {
          var best_time, heroes, i, leader, max, results, t, total_time, worst_time, _i, _len, _ref;
          PDJStools.logg(json);
          heroes = {};
          total_time = 0;
          worst_time = 0;
          best_time = PDJStools.SECONDS_IN_A_DAY * 365;
          max = 0;
          leader = 'no-one';
          _ref = json.incidents;
          for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            i = _ref[_i];
            t = new Date(i.last_status_change_on) - new Date(i.created_on);
            worst_time = Math.max(worst_time, t);
            best_time = Math.min(best_time, t);
            total_time += t;
            heroes[i.last_status_change_by.name] = (heroes[i.last_status_change_by.name] || 0) + 1;
            if (heroes[i.last_status_change_by.name] > max) {
              max = heroes[i.last_status_change_by.name];
              leader = i.last_status_change_by.name;
            }
          }
          results = {
            best_time: PDJStools.timeAsWords(best_time),
            worst_time: PDJStools.timeAsWords(worst_time),
            total_time: PDJStools.timeAsWords(total_time),
            average_time: PDJStools.timeAsWords(total_time / json.incidents.length),
            uptime: (new String((1 - (total_time / (PDJStools.SECONDS_IN_A_DAY * 90))) * 100)).substr(0, 5),
            leader: leader,
            leader_resolves: max,
            heroes: heroes
          };
          $("#" + service_id + ".pdjs_service_incidents").html("The average incident takes " + results.average_time + " ( " + results.best_time + " - " + results.worst_time + " ) " + results.leader + " has resolved " + results.leader_resolves + " incidents");
          return results;
        }
      };
      PDJStools.logg(params);
      return $.ajax(params);
    };

    PDJSobj.prototype.open_service = function(me) {
      return window.open("https://" + this.subdomain + ".pagerduty.com/services/" + me.id);
    };

    PDJSobj.prototype.update_service = function(service_id) {
      var params,
        _this = this;
      PDJStools.logg("update_service: " + service_id + " at " + this.subdomain);
      params = {
        url: "https://" + this.subdomain + ".pagerduty.com/api/v1/services/" + service_id,
        type: "GET",
        headers: {
          Authorization: 'Token token=' + this.token
        },
        success: function(json) {
          var desc, status;
          status = "resolved";
          if (json.service.incident_counts.acknowledged) {
            status = "acknowledged";
          }
          if (json.service.incident_counts.triggered) {
            status = "triggered";
          }
          if (json.service.status === "disabled") {
            status = "disabled";
          }
          if (_this.services[service_id] !== status) {
            desc = "Service: \"" + json.service.name + "\" was " + status + " as of " + PDJStools.timeUntil(json.service.last_incident_timestamp);
            $("#" + service_id + ".pdjs_service").removeClass("pdjs_triggered").removeClass("pdjs_acknowledged").removeClass("pdjs_resolved").removeClass("pdjs_disabled");
            $("#" + service_id + ".pdjs_service").attr("title", desc).addClass("pdjs_" + status);
            return _this.services[service_id] = status;
          }
        }
      };
      return $.ajax(params);
    };

    PDJSobj.prototype.update_schedule = function(schedule_id) {
      PDJStools.logg(this.version);
      PDJStools.logg("update_schedule: " + schedule_id);
      return this.api({
        res: "schedules/" + schedule_id + "/entries",
        data: {
          "overflow": "true",
          "since": (new Date()).toISOString(),
          "until": (new Date()).toISOString()
        },
        success: function(json) {
          var end, on_call, status;
          PDJStools.logg(json);
          on_call = json.entries[0];
          end = new Date(on_call.end);
          status = "<a href=\"https://pdt-dave.pagerduty.com/users/" + on_call.user.id + "\" target=\"_blank\">" + on_call.user.name + "</a> is on call for another " + PDJStools.timeUntil(end);
          return $("#" + schedule_id + ".pdjs_schedule").html(status);
        }
      });
    };

    PDJSobj.prototype.api = function(params) {
      PDJStools.logg("Call to API: ");
      PDJStools.logg(this);
      PDJStools.logg(params);
      params.url = params.url || PDJSobj.protocol + "://" + this.subdomain + "." + PDJSobj.server + "/api/v1/" + params.res;
      params.headers = params.headers || [];
      params.data = params.data || [];
      params.data.PDJSversion = PDJSobj.version;
      params.headers.Authorization = 'Token token=' + this.token;
      params.error = function(a, b, c) {
        PDJStools.logg("Error");
        PDJStools.logg(a);
        PDJStools.logg(b);
        return PDJStools.logg(c);
      };
      PDJStools.logg(params);
      return $.ajax(params);
    };

    PDJSobj.prototype.attach_things = function(subdomain, token, refresh) {
      if (refresh == null) {
        refresh = 60;
      }
      this.subdomain = subdomain;
      this.token = token;
      this.refresh = refresh;
      return this.services = {};
    };

    PDJSobj.prototype.update_things = function() {
      var s, _i, _j, _k, _len, _len1, _len2, _ref, _ref1, _ref2, _results;
      _ref = $(".pdjs_service_incidents");
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        s = _ref[_i];
        this.update_service_incidents(s.id);
      }
      _ref1 = $(".pdjs_service");
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        s = _ref1[_j];
        this.update_service(s.id);
      }
      _ref2 = $(".pdjs_schedule");
      _results = [];
      for (_k = 0, _len2 = _ref2.length; _k < _len2; _k++) {
        s = _ref2[_k];
        _results.push(this.update_schedule(s.id));
      }
      return _results;
    };

    return PDJSobj;

  })();

  jQuery(function() {
    window.PDJS = new PDJSobj;
    PDJS.attach_things(pdjs_settings.subdomain, pdjs_settings.token, pdjs_settings.refresh);
    return window.PDJS.update_schedule("PQBSD51");
  });

  PDJStools = (function() {
    function PDJStools() {}

    PDJStools.SECONDS_IN_A_DAY = 24 * 60 * 60 * 1000;

    PDJStools.logging = true;

    PDJStools.logg = function(str) {
      if (this.logging) {
        return console.log(str);
      }
    };

    PDJStools.timeUntil = function(time) {
      return this.timeBetween(time, new Date());
    };

    PDJStools.timeBetween = function(start, end) {
      var delta;
      if (typeof start === "string") {
        start = new Date(start);
      }
      if (typeof end === "string") {
        end = new Date(end);
      }
      delta = Math.abs(end - start);
      return this.timeAsWords(delta);
    };

    PDJStools.timeAsWords = function(delta) {
      var a, b, diffs, f, i, num, str;
      if (delta < 1000) {
        return "0 seconds";
      }
      diffs = [[1000, "millisecond"], [60, "second"], [60, "minute"], [24, "hour"], [7, "day"], [52, "week"], [99999, "year"]];
      f = this.SECONDS_IN_A_DAY * 7 * 52;
      str = "f: " + f;
      i = diffs.length - 1;
      num = (function() {
        var _results;
        _results = [];
        while (i -= 1) {
          if (delta > f) {
            a = Math.floor(delta / f);
            str = a + " " + diffs[i + 1][1];
            if (a > 1) {
              str += "s";
            }
            if (i > 0) {
              b = Math.floor((delta % f) / (f / diffs[i][0]));
              if (b > 0) {
                str = str + " and " + b + " " + diffs[i][1];
              }
              if (b > 1) {
                str += "s";
              }
            }
            delta = 0;
          }
          _results.push(f = f / diffs[i][0]);
        }
        return _results;
      })();
      return str;
    };

    return PDJStools;

  })();

  window.PDJSt = PDJStools;

  PDJStools.logg("test");

}).call(this);
