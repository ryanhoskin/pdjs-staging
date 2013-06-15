SECONDS_IN_A_DAY = 24*60*60*1000

#This doesn't work yet:
showNotification = (title, message) ->
  if (window.webkitNotifications.checkPermission() == 0) # 0 is PERMISSION_ALLOWED
    notification = window.webkitNotifications.createNotification(
       'http://metrics.pd-internal.com/assets/alex_unhappy.png',
       title,
       message
    )
    notification.onclick = ->
      logg("Clicked")
    notification.show()
  else
    window.webkitNotifications.requestPermission()

logg = (str) ->
  console.log(str)
timeUntil = (time) ->
  timeBetween(time, new Date())
timeBetween = (start, end) ->
  if(typeof start == "string") 
    start = new Date(start)
  if(typeof end == "string") 
    end = new Date(end)
  delta = Math.abs(end - start)
  timeAsWords(delta)
timeAsWords = (delta) ->
  if(delta<1000) 
    return "0 seconds";
  diffs = [
    [1000,"millisecond"]
    [60,"second"]
    [60,"minute"]
    [24,"hour"]
    [7,"day"]
    [52,"week"]
    [99999,"year"]
  ]
  f = SECONDS_IN_A_DAY * 7 * 52;
  str = "f: " + f
  i = diffs.length-1
  num = while i -= 1
    if(delta>f)
      a = Math.floor(delta/f)
      str = a + " " + diffs[i+1][1]
      if(a>1) 
        str += "s"
      if(i>0)
        b = Math.floor((delta%f)/(f/diffs[i][0]))
        if(b>0) 
          str = str + " and " + b + " " + diffs[i][1]
        if(b>1) 
          str += "s"
      delta = 0
    f = f/diffs[i][0]
  str


class PDJSobj
  set_token: (token) ->
    this.token=token
  set_subdomain: (subdomain) ->
    this.subdomain=subdomain
  update_service_incidents: (service_id) -> 
    until_date = (new Date())
    since_date = ( new Date(until_date.getTime() - 90*SECONDS_IN_A_DAY) )
    params = 
      url: "https://"+this.subdomain+".pagerduty.com/api/v1/incidents"
      type: "GET"
      headers: 
        Authorization: 'Token token='+this.token
      data:
        status: "resolved"
        service: service_id
        sort_by: 'created_on:desc'
        "since": since_date.toISOString()
        "until": until_date.toISOString()
      success: (json) -> 
        logg(json)
        heroes = {}
        total_time = 0
        worst_time = 0
        best_time = SECONDS_IN_A_DAY*365
        max = 0
        leader = 'no-one'
        for i in json.incidents
          t = ( new Date(i.last_status_change_on) - new Date(i.created_on) )
          worst_time = Math.max(worst_time, t)
          best_time = Math.min(best_time, t)
          total_time += t
          heroes[i.last_status_change_by.name] = (heroes[i.last_status_change_by.name]||0)+1
          if(heroes[i.last_status_change_by.name]>max)
            max = heroes[i.last_status_change_by.name]
            leader = i.last_status_change_by.name
        results = 
          best_time: timeAsWords(best_time)
          worst_time: timeAsWords(worst_time)
          total_time: timeAsWords(total_time)
          average_time: timeAsWords(total_time/json.incidents.length)
          uptime: (new String((1 - ( total_time/ (SECONDS_IN_A_DAY*90) ))*100)).substr(0,5)
          leader: leader
          leader_resolves: max
          heroes: heroes
        $("#"+service_id+".pdjs_service_incidents").html("The average incident takes "+results.average_time+" ( "+results.best_time+" - "+results.worst_time+" ) "+results.leader+" has resolved "+results.leader_resolves+ " incidents")
        results
    console.log(params)
    $.ajax(params)

  open_service: (me) ->
    window.open("https://"+this.subdomain+".pagerduty.com/services/"+me.id)
  update_service: (service_id) ->
    logg("update_service: "+service_id + " at "+this.subdomain)
    params =
      url: "https://"+this.subdomain+".pagerduty.com/api/v1/services/"+service_id,
      type: "GET",
      headers: 
        Authorization: 'Token token='+this.token
      success: (json) =>
        status = "resolved"
        if(json.service.incident_counts.acknowledged) 
          status="acknowledged"
        if(json.service.incident_counts.triggered) 
          status="triggered"
        if(json.service.status=="disabled") 
          status="disabled"
        if(this.services[service_id] != status)
          desc = "Service: \""+json.service.name+"\" was "+status+" as of "+timeUntil(json.service.last_incident_timestamp);
          $("#"+service_id+".pdjs_service").removeClass("pdjs_triggered").removeClass("pdjs_acknowledged").removeClass("pdjs_resolved").removeClass("pdjs_disabled")
          $("#"+service_id+".pdjs_service").attr("title", desc).addClass("pdjs_"+status)
          this.services[service_id] = status

    $.ajax(params)    
  update_schedule: (schedule_id) ->
    logg("update_schedule: "+schedule_id)
    params = 
      url: "https://"+this.subdomain+".pagerduty.com/api/v1/schedules/"+schedule_id+"/entries"
      type: "GET"
      headers: 
        Authorization: 'Token token='+this.token
      data: 
        "overflow" : "true"
        "since":(new Date()).toISOString()
        "until":(new Date()).toISOString()
      success: (json) ->
        logg(json)
        on_call = json.entries[0]
        end = new Date(on_call.end)
        status = "<a href=\"https://pdt-dave.pagerduty.com/users/"+on_call.user.id+"\" target=\"_blank\">"+on_call.user.name+"</a> is on call for another "+timeUntil(end)
        $("#"+schedule_id+".pdjs_schedule").html(status)
    $.ajax(params)
  api: (url) ->
    

  attach_things: (subdomain, token, refresh=60) =>
    this.subdomain = subdomain
    this.token = token
    this.refresh = refresh
    this.services = {}
    this.update_things()
    setInterval =>
      this.update_things()
    , refresh*1000
  update_things: () =>
    for s in $(".pdjs_service_incidents")
      this.update_service_incidents(s.id)
    for s in $(".pdjs_service")
      this.update_service(s.id)
    for s in $(".pdjs_schedule")
      this.update_schedule(s.id)


jQuery -> 
  window.PDJS = new PDJSobj
  PDJS.attach_things(pdjs_settings.subdomain, pdjs_settings.token, pdjs_settings.refresh)

