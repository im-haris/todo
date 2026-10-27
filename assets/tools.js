/* Scalevora free Amazon PPC tools. All maths runs locally; nothing is transmitted. */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var num = function (id) { var e = $(id); return e ? parseFloat(e.value) : NaN; };
  var money = function (n) { return '$' + n.toFixed(2); };
  var pct = function (n) { return n.toFixed(1) + '%'; };

  function setVerdict(el, cls, title, body) {
    el.className = 'verdict ' + cls;
    el.innerHTML = '<b></b>';
    el.firstChild.textContent = title;
    el.appendChild(document.createTextNode(body));
  }
  function bind(ids, fn) {
    ids.forEach(function (id) {
      var e = $(id);
      if (e) { e.addEventListener('input', fn); }
    });
    fn();
  }

  /* ---------- Tool 1: placement bid multiplier ---------- */
  var P = ['p_acos', 'p_target', 'p_cur', 'p_bid'];
  function placement() {
    var acos = num('p_acos'), target = num('p_target'), cur = num('p_cur'), bid = num('p_bid');
    var v = $('p_verdict');
    var blank = ['p_out_mult', 'p_out_now', 'p_out_new', 'p_out_delta'];
    if (!(acos > 0) || !(target > 0) || !(bid > 0) || isNaN(cur) || cur < 0) {
      blank.forEach(function (id) { $(id).textContent = '—'; $(id).className = 'v'; });
      setVerdict(v, 'idle', 'Enter your numbers', 'Current ACoS, target ACoS and base bid all need to be above zero.');
      return;
    }
    var nowEff = bid * (1 + cur / 100);
    var factor = target / acos;
    var newMult = (1 + cur / 100) * factor - 1;
    var capped = false, floored = false;
    if (newMult > 9) { newMult = 9; capped = true; }
    if (newMult < 0) { newMult = 0; floored = true; }
    var newEff = bid * (1 + newMult);
    var delta = newEff - nowEff;
    /* Placement adjustments cannot go below 0%, so the remaining correction
       has to come out of the base bid instead. */
    var suggestedBase = nowEff * factor;

    $('p_out_mult').textContent = Math.round(newMult * 100) + '%';
    $('p_out_now').textContent = money(nowEff);
    $('p_out_new').textContent = money(newEff);
    $('p_out_delta').textContent = (delta >= 0 ? '+' : '−') + money(Math.abs(delta)).replace('$', '$');
    $('p_out_delta').className = 'v ' + (Math.abs(delta) < 0.005 ? '' : (delta < 0 ? 'warn' : 'good'));

    if (capped) {
      setVerdict(v, 'warn', 'Capped at 900%',
        'The maths asks for more than Amazon allows. This placement is converting far better than your target needs — take the 900% and consider raising the base bid too.');
    } else if (floored) {
      setVerdict(v, 'bad', 'Lower the base bid — the adjustment cannot go lower',
        'Placement adjustments stop at 0%, and yours is already there (or close), so the placement lever is exhausted. To reach ' + pct(target) + ' ACoS the effective bid needs to come down to about ' + money(suggestedBase) + ' — so cut the base keyword bid from ' + money(bid) + ' to roughly ' + money(suggestedBase) + ' and leave the adjustment at 0%.');
    } else if (acos > target * 1.6) {
      setVerdict(v, 'bad', 'Cut this placement back hard',
        'ACoS here is well above target. Dropping the adjustment to ' + Math.round(newMult * 100) + '% pulls the effective bid down to ' + money(newEff) + '. Check the search term report before assuming the placement is at fault — a few bad terms can distort one placement.');
    } else if (acos > target) {
      setVerdict(v, 'warn', 'Trim the adjustment',
        'Set the placement adjustment to roughly ' + Math.round(newMult * 100) + '%. That moves your effective bid from ' + money(nowEff) + ' to ' + money(newEff) + '. Give it 7–14 days before judging the result.');
    } else {
      setVerdict(v, 'good', 'Room to bid up',
        'This placement is already beating your target, so you can afford ' + Math.round(newMult * 100) + '% — an effective bid of ' + money(newEff) + '. Raise it in steps of about 25% rather than all at once, and watch impression share as you go.');
    }
  }

  /* ---------- Tool 2: breakeven ACoS and max CPC ---------- */
  var B = ['b_price', 'b_cogs', 'b_ref', 'b_fba', 'b_cvr', 'b_margin'];
  function breakeven() {
    var price = num('b_price'), cogs = num('b_cogs'), ref = num('b_ref'),
        fba = num('b_fba'), cvr = num('b_cvr'), margin = num('b_margin');
    var v = $('b_verdict');
    var ids = ['b_out_profit', 'b_out_be', 'b_out_target', 'b_out_maxcpc', 'b_out_tcpc'];
    if (!(price > 0) || !(cvr > 0) || isNaN(cogs) || isNaN(ref) || isNaN(fba) || isNaN(margin)) {
      ids.forEach(function (id) { $(id).textContent = '—'; $(id).className = 'v'; });
      setVerdict(v, 'idle', 'Enter your numbers', 'Selling price and conversion rate both need to be above zero.');
      return;
    }
    var refFee = price * ref / 100;
    var profit = price - cogs - refFee - fba;
    var be = profit / price * 100;
    var targetAcos = be - margin;
    var maxCpc = (be / 100) * price * (cvr / 100);
    var tCpc = (targetAcos / 100) * price * (cvr / 100);

    $('b_out_profit').textContent = money(profit);
    $('b_out_profit').className = 'v ' + (profit <= 0 ? 'bad' : 'good');
    $('b_out_be').textContent = pct(be);
    $('b_out_be').className = 'v ' + (be <= 0 ? 'bad' : '');
    $('b_out_target').textContent = pct(targetAcos);
    $('b_out_target').className = 'v ' + (targetAcos <= 0 ? 'bad' : 'good');
    $('b_out_maxcpc').textContent = maxCpc > 0 ? money(maxCpc) : '—';
    $('b_out_tcpc').textContent = tCpc > 0 ? money(tCpc) : '—';
    $('b_out_tcpc').className = 'v ' + (tCpc <= 0 ? 'bad' : 'good');

    if (profit <= 0) {
      setVerdict(v, 'bad', 'This product loses money before advertising',
        'Costs and fees already exceed the selling price. No bid is safe here — the fix is price, COGS or fulfilment method, not PPC.');
    } else if (targetAcos <= 0) {
      setVerdict(v, 'bad', 'Your margin target leaves nothing for ads',
        'Breakeven ACoS is ' + pct(be) + ' but you want to keep ' + margin.toFixed(1) + '%. Either accept a thinner margin on advertised units or improve unit economics first.');
    } else if (be < 12) {
      setVerdict(v, 'warn', 'Very tight margins',
        'Breakeven ACoS of ' + pct(be) + ' leaves little headroom. Keep bids under ' + money(tCpc) + ' and lean on organic rank — at this margin, advertising can only ever be a supporting channel.');
    } else {
      setVerdict(v, 'good', 'Workable economics',
        'You break even at ' + pct(be) + ' ACoS, so target ' + pct(targetAcos) + ' and keep CPCs at or under ' + money(tCpc) + '. Anything above ' + money(maxCpc) + ' per click is losing money on every sale it generates.');
    }
  }

  /* ---------- Tool 3: keyword decision ---------- */
  var D = ['d_clicks', 'd_spend', 'd_orders', 'd_sales', 'd_target', 'd_cvr'];
  function decision() {
    var clicks = num('d_clicks'), spend = num('d_spend'), orders = num('d_orders'),
        sales = num('d_sales'), target = num('d_target'), cvr = num('d_cvr');
    var v = $('d_verdict');
    var ids = ['d_out_acos', 'd_out_cvr', 'd_out_cpc', 'd_out_cpo', 'd_out_need'];
    if (isNaN(clicks) || clicks < 0 || isNaN(spend) || spend < 0 || isNaN(orders) || orders < 0 || !(target > 0) || !(cvr > 0)) {
      ids.forEach(function (id) { $(id).textContent = '—'; $(id).className = 'v'; });
      setVerdict(v, 'idle', 'Enter your numbers', 'Target ACoS and account conversion rate need to be above zero.');
      return;
    }
    var need = Math.ceil((100 / cvr) * 2);
    var acos = sales > 0 ? (spend / sales * 100) : null;
    var actualCvr = clicks > 0 ? (orders / clicks * 100) : 0;
    var cpc = clicks > 0 ? spend / clicks : 0;
    var cpo = orders > 0 ? spend / orders : null;

    $('d_out_acos').textContent = acos === null ? 'No sales' : pct(acos);
    $('d_out_acos').className = 'v ' + (acos === null ? 'bad' : (acos <= target ? 'good' : (acos <= target * 1.3 ? 'warn' : 'bad')));
    $('d_out_cvr').textContent = clicks > 0 ? pct(actualCvr) : '—';
    $('d_out_cpc').textContent = clicks > 0 ? money(cpc) : '—';
    $('d_out_cpo').textContent = cpo === null ? '—' : money(cpo);
    $('d_out_need').textContent = need + ' clicks';
    $('d_out_need').className = 'v ' + (clicks >= need ? 'good' : 'warn');

    if (orders === 0) {
      if (clicks < need) {
        setVerdict(v, 'warn', 'Not enough data yet — leave it alone',
          clicks + ' clicks is below the ' + need + ' a ' + cvr.toFixed(1) + '% conversion rate implies you need before a zero-order term means anything. Cutting now risks killing a term that simply has not had its chance. Revisit at ' + need + ' clicks.');
      } else {
        setVerdict(v, 'bad', 'Pause it or negative it',
          need + '+ clicks and ' + money(spend) + ' spent with no orders. At your conversion rate you would have expected around ' + Math.round(clicks * cvr / 100) + '. Add it as a negative exact in this campaign, and check whether the term is genuinely relevant to the product.');
      }
      return;
    }
    if (acos <= target * 0.7) {
      setVerdict(v, 'good', 'Scale it',
        'ACoS of ' + pct(acos) + ' is comfortably under your ' + pct(target) + ' target. Raise the bid 15–25%, and if this is an auto or broad campaign, harvest it into exact match so you can control it directly.');
    } else if (acos <= target) {
      setVerdict(v, 'good', 'Keep it, nudge up',
        'ACoS of ' + pct(acos) + ' is inside target. A 10–15% bid increase is usually safe here. Cost per order is ' + money(cpo) + '.');
    } else if (acos <= target * 1.3) {
      setVerdict(v, 'warn', 'Trim the bid, do not cut it',
        'ACoS of ' + pct(acos) + ' is over your ' + pct(target) + ' target but still converting. Drop the bid roughly ' + Math.round((1 - target / acos) * 100) + '% to about ' + money(cpc * (target / acos)) + ' and reassess in two weeks.');
    } else {
      setVerdict(v, 'bad', 'Cut the bid hard or pause',
        'ACoS of ' + pct(acos) + ' is well past target, at ' + money(cpo) + ' per order. Either drop the bid to around ' + money(cpc * (target / acos)) + ' or pause it. If the term is strategically important for rank, keep it but budget for it deliberately rather than letting it bleed.');
    }
  }

  if ($('p_acos')) { bind(P, placement); }
  if ($('b_price')) { bind(B, breakeven); }
  if ($('d_clicks')) { bind(D, decision); }
})();
