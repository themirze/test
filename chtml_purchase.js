<script>
(function () {
  var STORAGE_KEY = "gtmPendingCart_v1";

  function safeJsonParse(str) {
    try { return JSON.parse(str); } catch (e) { return null; }
  }

  function savePendingCart(obj) {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); } catch (e) {}
  }

  function loadPendingCart() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? safeJsonParse(raw) : null;
    } catch (e) { return null; }
  }

  function clearPendingCart() {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch (e) {}
  }

  function pushPurchase(siparisNo, pending) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "purchase",
      userEmail: pending.email || undefined,
      ecommerce: {
        transaction_id: String(siparisNo),
        value: Number(pending.value || 0),
        currency: "TRY",
        items: pending.items || []
      }
    });
  }

  var origOpen = XMLHttpRequest.prototype.open;
  var origSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url) {
    this.__gtm_url = url;
    return origOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (body) {
    var requestData = {};

    try {
      if (typeof body === "string") {
        var params = new URLSearchParams(body);
        params.forEach(function (value, key) {
          requestData[key] = value;
        });
      } else if (body instanceof FormData) {
        body.forEach(function (value, key) {
          requestData[key] = value;
        });
      }
    } catch (e) {}

    this.addEventListener("load", function () {
      try {
        var url = this.responseURL || this.__gtm_url || "";
        if (!url || url.indexOf("/TR/ajax.php") === -1) return;
        if (this.status !== 200) return;

        var action = requestData["action"];

        if (action === "websatis_kaydet") {
          var email = requestData["email"];
          var sepetRaw = requestData["sepet"];

          var sepetJson = (typeof sepetRaw === "string") ? safeJsonParse(sepetRaw) : sepetRaw;
          if (!sepetJson || !Array.isArray(sepetJson)) return;

          var totalValue = 0;
          var items = sepetJson.map(function (item) {
            var price = parseFloat(item.fiyat);
            var qty = parseInt(item.adet, 10) || 1;
            totalValue += (price * qty);

            return {
              item_id: String(item.urun_id),
              price: price,
              quantity: qty
            };
          });

          savePendingCart({
            email: email,
            items: items,
            value: totalValue,
            ts: Date.now()
          });
        }

        if (action === "encrypt") {
          var siparisNo = requestData["siparis_no"];
          if (!siparisNo) return;

          var pending = loadPendingCart();
          if (!pending) return;

          pushPurchase(siparisNo, pending);
          clearPendingCart();
        }
      } catch (e) {}
    });

    return origSend.apply(this, arguments);
  };
})();
</script>
