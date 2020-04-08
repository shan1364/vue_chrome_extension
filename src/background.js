//global.browser = require('webextension-polyfill');

function saveAjaxInput(links) {
  console.log(links);
  console.log("start to save 'Ajax' origin  input links");
  //清除儲存區中的 個人介紹物件
  chrome.storage.local.set({ profile: { data: "", state: "" } }, function () { });
  //處理連結
  let link_arr = [];
  let url_pattern = "www.facebook.com";
  let origin_links = links;
  //console.log('origin:', origin_links)
  let j = 1;
  for (let i = 0; i < origin_links.length; i++) {
    let item_obj = {};
    if (origin_links[i].search(url_pattern) >= 0) {
      item_obj.id = j;
      item_obj.link = origin_links[i].replace(/(\r\n|\n|\r)/gm, "");
      item_obj.data = "";
      item_obj.state = "";
      link_arr.push(item_obj);
      j++;
    }
  }
  let len = link_arr.length;
  link_arr.push({ len: len });
  let link_obj = { ...link_arr };
  console.log("input links:", link_obj);
  chrome.storage.local.set({ profile: { data: link_obj } }, function () { });
}


function fetchData() {
  //透過瀏覽器建立一個包含傳送和接收資料方法的物件
  var xhttp = new XMLHttpRequest();
  xhttp.open("POST", "./input_data/input.json");
  //定義callback函式,接收到資料要做什麼處理; readyState:Ajax狀態的變化 status:request的狀態(Http Status);
  xhttp.onreadystatechange = function () {
    if (xhttp.readyState == 4 && xhttp.status == 200) {
      let ajaxInput = JSON.parse(xhttp.responseText);

      if (ajaxInput.type !== null && ajaxInput.links !== null && /profile/i.test(ajaxInput.type)) {

        chrome.storage.local.get("profile", function (item) {
          //可以存入連結並爬取
          if (item.profile.data == "") {
            let origin_item = item.profile.data;
            if (origin_item === "") {
              let filter_input_array = ajaxInput.links.filter(item => item.search("www.facebook.com") >= 0);
              let keys = Object.keys(origin_item);
              let storage_array = [];
              for (const key of keys) {
                if (!origin_item[key].hasOwnProperty("len") && origin_item[key].data !== "") storage_array.push(origin_item[key].link);
              }
              let storage_final = storage_array.toString();
              let input_final = filter_input_array.toString();
              console.log("storage_final", storage_final, "input_final", input_final,"execute AJAX?", storage_final.search(input_final));
              if (storage_final.search(input_final) == -1) saveAjaxInput(ajaxInput.links);
            }

          }
        })
      } else if (ajaxInput.type !== null && ajaxInput.links !== null && /comment/i.test(ajaxInput.type)) {
        chrome.storage.local.get("comment", function (item) {
          if (item.comment.data == "") {
            //SAVE LINKS::::
            console.log(item.comment.data);

          }

        })
      }
    }
  };
  //送出請求
  xhttp.send();
}

setInterval(fetchData, 20000);