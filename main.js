/* Byron Parker concept: office status, mailto request form, GSAP scrollytelling (static-first) */
(function(){
  "use strict";
  var root = document.documentElement;
  var yr = document.getElementById("yr"); if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- Office hours: Mon–Fri 8:00–16:00 America/New_York ---------- */
  function nyNow(){
    try{
      var o = {}; new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",weekday:"short",hour:"numeric",minute:"numeric",hour12:false}).formatToParts(new Date()).forEach(function(x){o[x.type]=x.value;});
      return {dow:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(o.weekday), min:(parseInt(o.hour,10)%24)*60+parseInt(o.minute,10)};
    }catch(e){ var d=new Date(); return {dow:d.getDay(), min:d.getHours()*60+d.getMinutes()}; }
  }
  function paint(){
    var n = nyNow(), wk = n.dow>=1 && n.dow<=5, open = wk && n.min>=480 && n.min<960, txt;
    if (open) txt = "Office open now · until 4pm";
    else if (wk && n.min<480) txt = "Office opens today at 8am · leave a message anytime";
    else { var next = (n.dow===5||n.dow===6) ? "Monday" : (n.dow===0 ? "tomorrow (Mon)" : "tomorrow"); txt = "Office closed · opens " + next + " at 8am · leave a message"; }
    document.querySelectorAll("[data-status]").forEach(function(el){ el.textContent = txt; });
    document.querySelectorAll(".status").forEach(function(el){ el.classList.toggle("is-open", open); });
    document.querySelectorAll(".hours tr").forEach(function(tr){ tr.classList.toggle("is-today", +tr.getAttribute("data-dow")===n.dow); });
  }
  paint(); setInterval(paint, 60000);

  /* ---------- Nav ---------- */
  var nav = document.querySelector(".nav");
  function onScroll(){ nav && nav.classList.toggle("is-scrolled", window.scrollY > 30); }
  window.addEventListener("scroll", onScroll, {passive:true}); onScroll();

  /* ---------- Request form -> mailto (no backend) ---------- */
  var form = document.getElementById("qform");
  if (form){
    form.addEventListener("submit", function(e){
      e.preventDefault();
      var f = form.elements, err = form.querySelector(".qform__err");
      var name = f.name.value.trim(), phone = f.phone.value.trim();
      if (!name || !phone){ err.hidden = false; (name ? f.phone : f.name).focus(); return; }
      err.hidden = true;
      var urg = (form.querySelector('input[name="urgency"]:checked')||{}).value || "";
      var subject = "Service request: " + f.service.value + " (" + f.town.value + ")";
      var body = "Name: " + name + "\nPhone: " + phone + "\nTown: " + f.town.value + "\nService: " + f.service.value + "\nUrgency: " + urg + "\n\nWhat's going on:\n" + f.msg.value.trim() + "\n";
      window.location.href = "mailto:byronparkerinc@yahoo.com?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
    });
  }

  /* ---------- Timeline fill ---------- */
  var tl = document.querySelector(".tline");
  if (tl){ var fill = document.createElement("span"); fill.className = "tline__fill"; fill.setAttribute("aria-hidden","true"); tl.prepend(fill); }

  /* ---------- Motion ---------- */
  if (!window.gsap || !window.ScrollTrigger) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  gsap.registerPlugin(ScrollTrigger);
  root.classList.add("motion-ok");
  var lenis = null, mm = gsap.matchMedia();

  /* subtle reveals everywhere else */
  mm.add("(min-width: 0px)", function(){
    gsap.from(".hero__copy > *",{y:18, opacity:0, stagger:.07, duration:.8, ease:"power2.out", delay:.05});
    gsap.from(".hero__photo",{opacity:0, y:24, duration:1, ease:"power2.out", delay:.2});
    gsap.utils.toArray(".sec-head").forEach(function(h){ gsap.from(h.children,{y:18, opacity:0, stagger:.08, duration:.7, ease:"power2.out", scrollTrigger:{trigger:h, start:"top 85%", once:true}}); });
    ScrollTrigger.batch(".reveal",{start:"top 88%", once:true, onEnter:function(b){ gsap.from(b,{y:22, opacity:0, stagger:.08, duration:.7, ease:"power2.out", overwrite:true}); }});
    gsap.from(".fact",{opacity:0, y:12, stagger:.07, duration:.6, ease:"power2.out", scrollTrigger:{trigger:".facts", start:"top 92%", once:true}});
    var mapTl = gsap.timeline({scrollTrigger:{trigger:".map", start:"top 78%", once:true, refreshPriority:-2}});
    mapTl.from(".map__river",{strokeDasharray:900, strokeDashoffset:900, duration:1.2, ease:"power1.out"})
         .from(".map__hq",{opacity:0, duration:.5},"-=.7")
         .from(".map__towns .t",{opacity:0, duration:.4, stagger:.035},"<")
         .from(".map__region, .map__rivername, .map__gsub",{opacity:0, duration:.6},"<");
    gsap.to(".tline__fill",{scaleY:1, ease:"none", scrollTrigger:{trigger:".tline", start:"top 70%", end:"bottom 65%", scrub:.5, refreshPriority:-3}});
    gsap.utils.toArray(".tline li").forEach(function(li){ gsap.from(li,{y:18, opacity:0, duration:.7, ease:"power2.out", scrollTrigger:{trigger:li, start:"top 86%", once:true, refreshPriority:-3}}); });
    gsap.from(".album__pic",{y:24, opacity:0, stagger:.08, duration:.7, ease:"power2.out", scrollTrigger:{trigger:".album", start:"top 88%", once:true, refreshPriority:-3}});
  });

  mm.add("(min-width: 901px)", function(){
    root.classList.add("motion-desk");
    if (window.Lenis){
      lenis = new Lenis({lerp:.11, smoothWheel:true}); window.__lenis = lenis;
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(function(t){ lenis && lenis.raf(t*1000); });
      gsap.ticker.lagSmoothing(0);
    }
    return function(){ root.classList.remove("motion-desk"); if (lenis){ lenis.destroy(); lenis = null; window.__lenis = null; } };
  });

  /* REEL: scroll-scrubbed frames drawn to a canvas (progressive preload, poster first) */
  (function reel(){
    var sec = document.querySelector(".reel"); if (!sec) return;
    var canvas = sec.querySelector(".reel__canvas"), ctx = canvas.getContext("2d");
    var poster = sec.querySelector(".reel__poster");
    var N = 241, small = window.innerWidth <= 900, dir = small ? "frames/m/" : "frames/d/";
    canvas.width = small ? 640 : 1280; canvas.height = small ? 360 : 720;
    var imgs = new Array(N), loaded = new Array(N), current = -1, want = 0;
    function src(i){ return dir + "f" + String(i+1).padStart(3,"0") + ".webp"; }
    function nearest(i){ for (var d=0; d<N; d++){ if (loaded[i-d]) return i-d; if (loaded[i+d]) return i+d; } return -1; }
    function draw(i){
      var k = nearest(i); if (k < 0 || k === current) return;
      current = k; ctx.drawImage(imgs[k], 0, 0, canvas.width, canvas.height);
      if (poster.style.visibility !== "hidden") poster.style.visibility = "hidden";
    }
    // load order: coarse to fine so scrubbing works early (every 16th, 8th, 4th, 2nd, then all)
    var order = [], seen = {};
    [16,8,4,2,1].forEach(function(step){ for (var i=0;i<N;i+=step){ if (!seen[i]){ seen[i]=1; order.push(i); } } });
    if (!seen[N-1]) order.splice(1,0,N-1);
    var q = 0, active = 0, MAX = 6;
    function pump(){
      while (active < MAX && q < order.length){
        (function(i){
          active++; var im = new Image(); im.decoding = "async";
          im.onload = function(){ imgs[i] = im; loaded[i] = true; active--; if (Math.abs(i-want) < Math.abs(current-want) || current < 0) draw(want); pump(); };
          im.onerror = function(){ active--; pump(); };
          im.src = src(i);
        })(order[q++]);
      }
    }
    // start loading when the section is getting close (poster covers until then)
    ScrollTrigger.create({trigger:sec, start:"top 250%", once:true, onEnter:pump, refreshPriority:-2});
    var caps = gsap.utils.toArray(".reel__cap"), bar = sec.querySelector(".reel__bar span");
    function capsAt(p){
      caps.forEach(function(c){
        var on = p >= parseFloat(c.dataset.from) && p < parseFloat(c.dataset.to);
        if (on !== c._on){ c._on = on; gsap.to(c,{autoAlpha:on?1:0, y:on?0:(p < parseFloat(c.dataset.from) ? 24 : -24), duration:.45, ease:"power2.out", overwrite:true}); }
      });
    }
    gsap.set(caps,{autoAlpha:0, y:24});
    capsAt(0);
    // timeline of the pinned section: hold + zoom-out on frame 1, scrub the clip, hold + push-in on the last frame
    var HOLD_IN = 0.07, CLIP_END = 0.86;
    ScrollTrigger.create({trigger:sec, start:"top top", end:"+=" + (small ? 340 : 460) + "%", pin:true, scrub:true, anticipatePin:1, refreshPriority:-2,
      onUpdate:function(st){
        var p = st.progress, f, scale;
        if (p < HOLD_IN){ f = 0; scale = 1.12 - 0.12*(p/HOLD_IN); }
        else if (p < CLIP_END){ f = (p-HOLD_IN)/(CLIP_END-HOLD_IN); scale = 1; }
        else { f = 1; var q = (p-CLIP_END)/(1-CLIP_END); scale = 1 + 0.14*(q*q*(3-2*q)); }
        want = Math.min(N-1, Math.round(f*(N-1)));
        draw(want); canvas.style.transform = poster.style.transform = "scale(" + scale.toFixed(4) + ")";
        capsAt(p); if (bar) bar.style.transform = "scaleX(" + p + ")";
      }});
    canvas.style.transform = poster.style.transform = "scale(1.12)";
  })();

  document.addEventListener("click", function(e){
    var a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a || !lenis) return;
    var id = a.getAttribute("href"), target = id === "#top" ? 0 : document.querySelector(id); if (target === null) return;
    e.preventDefault(); lenis.scrollTo(target, {offset:-76, duration:1.2}); history.replaceState(null,"",id);
  });
  window.addEventListener("load", function(){ ScrollTrigger.refresh(); });
})();
