(function () {
  var uname = document.getElementById('uname');
  var srv = document.getElementById('srv');
  var stat = document.getElementById('srvstat');
  var card = document.getElementById('playObby');

  uname.value = localStorage.getItem('bw_name') || '';
  srv.value = localStorage.getItem('bw_server') || '';

  uname.addEventListener('input', function () {
    localStorage.setItem('bw_name', uname.value.trim());
  });
  srv.addEventListener('input', function () {
    localStorage.setItem('bw_server', srv.value.trim());
    ping();
  });

  var pingTimer = null;
  function ping() {
    if (pingTimer) clearTimeout(pingTimer);
    pingTimer = setTimeout(function () {
      var url = srv.value.trim();
      if (!url) { stat.innerHTML = ''; return; }
      stat.innerHTML = 'Checking server\u2026';
      try {
        var ws = new WebSocket(url);
        var done = false;
        var to = setTimeout(function () {
          if (done) return; done = true;
          try { ws.close(); } catch (e) {}
          stat.innerHTML = '<span class="off">\u25CF Server unreachable \u2014 games will run in solo mode</span>';
        }, 4000);
        ws.onopen = function () {
          if (done) return; done = true;
          clearTimeout(to);
          stat.innerHTML = '<span class="on">\u25CF Server online! Multiplayer ready</span>';
          ws.close();
        };
        ws.onerror = function () {
          if (done) return; done = true;
          clearTimeout(to);
          stat.innerHTML = '<span class="off">\u25CF Server unreachable \u2014 games will run in solo mode</span>';
        };
      } catch (e) {
        stat.innerHTML = '<span class="off">\u25CF Invalid server address</span>';
      }
    }, 500);
  }
  ping();

  card.addEventListener('click', function (e) {
    if (e.target.tagName !== 'A') window.location.href = 'obby.html';
  });
})();
