<template>
  <div id="app" class="container">
    <div class="container">
      <div class="row">
        <div class="col">
          <hr class="style-one" />
          <!-- <p>輸入Facebook個人介紹連結(可多個),並以逗號隔開 :</p> -->
          <form>
            <div class="form-group">
              <label for="inputLink">輸入Facebook個人介紹連結(可多個),並以逗號隔開 :</label>
              <textarea
                class="form-control"
                id="inputArea"
                placeholder="facebook.com/profile.ph.?id=example"
                rows="5"
                v-model="inputLinks"
                style="word-wrap : break-word;"
              ></textarea>
            </div>
          </form>
        </div>
      </div>
      <p>結果:</p>
      <table class="table">
        <thead>
          <tr class="table-active">
            <th data-field="id">ID</th>
            <th data-field="link" colspan="2">link</th>
            <th data-field="progress">progress</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in checkShow(objectData)" :key="item">
            <th>{{ item.id }}</th>
            <th colspan="2" style="word-break:break-all;">{{ item.link }}</th>
            <th>
              <span class="fui-check" v-if="item.data !== ''" style="color:#32CD32;"></span>
            </th>
          </tr>
        </tbody>
      </table>

      <div class="row">
        <div class="col">
          <button class="btn btn-primary" v-on:click="saveInputLink">
            <span class="fui-search"></span> 送出連結
          </button>
        </div>
        <div class="col"></div>
        <div class="col">
          <button class="btn btn-primary" v-on:click="downloadData">
            <span class="fui-clip"></span> 下載結果
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
const browser = require("webextension-polyfill");
//引入 to-csv
const { Parser } = require("json2csv");

export default {
  data() {
    return {
      objectData: {}
    };
  },

  methods: {
    saveInputLink: function() {
      console.log("start to save origin links");
      //清除儲存區
      console.log("data:", this.inputLinks);
      chrome.storage.sync.clear(function() {});
      //處理連結
      let links = this.inputLinks.split(",");
      var arr = [];
      var j = 1;
      for (let i = 0; i < links.length; i++) {
        let item_obj = {};
        let url_pattern = "www.facebook.com";
        if (links[i].search(url_pattern) >= 0) {
          let id = j;
          item_obj.id = id;
          item_obj.link = links[i].replace(/(\r\n|\n|\r|)/gm, "");
          item_obj.data = "";
          item_obj.state = "";
          arr.push(item_obj);
          j++;
        }
      }
      let len = arr.length;
      arr.push({ len: len });
      let obj = { ...arr };
      console.log(obj);
      this.objectData = obj;
      console.log("vue data:", this.objectData);
      //寫入儲存區
      chrome.storage.sync.set(obj, function() {
        console.log("save origin links finish");
      });
    },

    downloadData: function() {
      chrome.storage.sync.get(null, function(data) {
        let origin_item = data;
        let keys = Object.keys(origin_item);
        let output_array = [];
        for (const key of keys) {
          if (
            !origin_item[key].hasOwnProperty("len") &&
            origin_item[key].data !== ""
          ) {
            output_array.push(origin_item[key]);
          }
        }
        const fields = [
          {
            label: "id",
            value: "id"
          },
          { label: "link", value: "link" },
          { label: "user_ID", value: "data.ID" },
          { label: "user_name", value: "data.name" },
          { label: "user_img", value: "data.img" }
        ];
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(output_array);
        console.log(csv);
        var hiddenElement = document.createElement("a");
        //encodeURI用來轉為UTF-8編碼
        hiddenElement.href = "data:text/csv;charset=utf-8,\uFEFF" + encodeURI(csv);
        hiddenElement.target = "_blank";
        hiddenElement.download = "link_profileData.csv";
        hiddenElement.click();
      });
    },

    checkShow: function(items) {
      let origin_item = items;
      var keys = Object.keys(origin_item);
      let arr = [];
      for (const key of keys) {
        if (!origin_item[key].hasOwnProperty("len")) {
          arr.push(origin_item[key]);
        }
      }
      return arr;
    }
  },

  mounted: function() {
    var _this = this;

    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      //更新storage的資料 並(1)到還沒去過的新頁面 或 (2)完成 印出
      chrome.storage.onChanged.addListener(function(changes, namespace) {
        chrome.storage.sync.get(null, function(data) {
          //更新資料到 vue
          _this.objectData = data;

          let origin_item = data;
          var keys = Object.keys(origin_item);
          for (var key in changes) {
            var storageChange = changes[key];
            console.log(
              'Storage key "%s" in namespace "%s" changed. Old value was "%s", new value is "%s".',
              key,
              namespace,
              storageChange.oldValue,
              storageChange.newValue
            );
          }
          for (const key of keys) {
            //data=='' 代表要去新的連結
            if (
              !origin_item[key].hasOwnProperty("len") &&
              origin_item[key].data == ""
            ) {
              let goto_url = origin_item[key].link;
              console.log("ready to:", goto_url);
              chrome.tabs.update({ url: goto_url });
              break;
            } else if (origin_item[key].hasOwnProperty("len")) {
              //全部完成 開始output
              let output_items = data;
              let keys = Object.keys(output_items);
              for (const key of keys) {
                if (!output_items[key].hasOwnProperty("len")) {
                  let item_data = output_items[key].data;
                  let ID = item_data.ID;
                  let name = item_data.name;
                  let img = item_data.img;
                  let items = { ID, name, img };
                  console.log("output item:", items);
                  //output_area.value += JSON.stringify(items) + ', ';
                }
              }
              console.log("output all finish");
              break;
            }
          }
        });
      });

      //確認已經到 新的連結
      chrome.tabs.onUpdated.addListener(function(tabID, changeInfo, tab) {
        if (changeInfo.status == "complete") {
          chrome.storage.sync.get(null, function(data) {
            let origin_item = data;
            var keys = Object.keys(origin_item);
            for (const key of keys) {
              if (
                !origin_item[key].hasOwnProperty("len") &&
                origin_item[key].state == ""
              ) {
                origin_item[key].state = "fetch";
                console.log(
                  "origin item:",
                  origin_item[key],
                  "start to fetch data"
                );
                chrome.storage.sync.set(origin_item, function() {});
                break;
              }
            }
          });
        }
      });
    });
  }
};
</script>

<style lang="scss" scoped>
#app {
  width: 500px;
  font-family: Microsoft JhengHei;
}
.container {
  background-color: #fafafa;
}

hr.style-one {
  border: 0;
  height: 1px;
  background-image: linear-gradient(
    to right,
    rgba(0, 0, 0, 0),
    rgba(0, 0, 0, 0.75),
    rgba(0, 0, 0, 0)
  );
}
</style>
