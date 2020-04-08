<template>
  <div id="app" class="container">
    <div class="container">
     <div class="card border-secondary">
       <div class="card-header">Profile</div>
       <div class="card-body">
         <div class="row">
           <div class="col">
             <form>
               <div class="form-group">
               <p>輸入Facebook個人介紹連結(可多個),並以逗號隔開 :</p>
               <!-- <label for="inputLink">輸入Facebook個人介紹連結(可多個),並以逗號隔開 :</label> -->
               <textarea  class="form-control" id="inputArea"
                placeholder="facebook.com/profile.ph.?id=example"
                rows="3" v-model="inputLinks" style="word-wrap : break-word;">
               </textarea>
              </div>            
             </form>
           </div>
         </div>

         <p>Profile結果:</p>
         <table class="table" id="profileTable">
           <thead>
             <tr class="table-active">
               <th data-field="id">ID</th>
               <th data-field="link" colspan="4">link</th>
               <th data-field="progress">progress</th>
            </tr>
           </thead>
           <tbody>
             <tr v-for="item in showProfileList(profileData)" :key="item">
               <th>{{ item.id }}</th>
               <th colspan="4" style="word-break:break-all;">{{ item.link }}</th>
               <th style="text-align: center">
                <span class="fui-check" v-if="item.data !== ''" style="color:#32CD32;"></span>
               </th>
             </tr>
           </tbody>
         </table>
         <div>
         <button class="button" id="button" v-on:click="saveInputLink">
           <span class="fui-search"></span> 送出連結
         </button>
         <button class="button" id="downloadProfileBtn" v-on:click="downloadProfileData">
           <span class="fui-clip"></span> 下載結果
         </button> 
         <button class="button" id="clearProfileBtn" v-on:click="clearProfileData">
           <span class="fui-trash"></span> 清除profile資料
         </button> 
         </div>
       </div>
     </div>

     <!-- 留言區塊 -->
     
     <div class="card border-secondary">
       <div class="card-header">Comment</div>
       <div class="card-body">
          <p>Comment結果:</p>
          <table class="table" id="commentTable">
            <thead>
              <tr class="table-active">
                <th data-field="id2">ID</th>
                <th data-field="name">name</th>
                <th colspan="4" data-field="content">comment</th>
                <th data-field="level">level</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in showCommentList(commentData)" :key="item">
                <th>{{ item.id }}</th>
                <th>{{ item.name }}</th>
                <th colspan="4" style="word-break:break-all;">{{ item.content }}</th>
                <th>{{ item.level }}</th>
              </tr>
            </tbody>
          </table>
          <div>
            <button class="button" id="commentBtn" v-on:click="fetchComment">
              <span class="fui-bubble"></span> 取得留言
            </button>
            <button class="button" id="downloadCommentBtn" v-on:click="downloadCommentData">
              <span class="fui-clip"></span> 下載結果
            </button>
            <button class="button" id="clearCommentBtn" v-on:click="clearCommentData">
              <span class="fui-trash"></span> 清除comment資料
             </button> 

          </div>

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
      profileData: {},
      commentData: {}
    };
  },

  methods: {
    saveInputLink: function() {
      console.log("start to save origin  input links");
      //清除儲存區中的 個人介紹物件
      //console.log("input links:", this.inputLinks);
      chrome.storage.local.set({ profile: { data: "", state: "" } }, function() {});
      //處理連結
      if(this.inputLinks == null || this.inputLinks.trim() == "") console.log('no input');
      else{
        let links = this.inputLinks.split(",");
        var link_arr = [];
        var j = 1;
        for (let i = 0; i < links.length; i++) {
          let item_obj = {};
          let url_pattern = "www.facebook.com";
          if (links[i].search(url_pattern) >= 0) {
            let id = j;
            item_obj.id = id;
            item_obj.link = links[i].replace(/(\r\n|\n|\r)/gm, "");
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
        this.profileData = link_obj;
        console.log("Vue profile data:", this.profileData);
        //寫入 個人介紹 的儲存區
        chrome.storage.local.set({ profile: { data: link_obj } }, function() {
          console.log("save origin links finish");
        });

      }  
    },

    downloadProfileData: function() {
      chrome.storage.local.get("profile", function(item) {
        let origin_item = item.profile.data;
        if (!origin_item[0].hasOwnProperty("len")) {
          let keys = Object.keys(origin_item);
          let output_array = [];
          for (const key of keys) {
            if ( !origin_item[key].hasOwnProperty("len") && origin_item[key].data !== "") output_array.push(origin_item[key]);
          }
          const fields = [
            { label: "id", value: "id" },
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
          hiddenElement.href =
            "data:text/csv;charset=utf-8,\uFEFF" + encodeURI(csv);
          hiddenElement.target = "_blank";
          hiddenElement.download = "link_profile_data.csv";
          hiddenElement.click();
        }
      });
    },

    clearProfileData: function() {
      chrome.storage.local.set({comment: { state: "", data: "" }}, function() {});
    },

    showProfileList: function(items) {
      let origin_item = items;
      var keys = Object.keys(origin_item);
      let arr = [];
      for (const key of keys) {
        if (!origin_item[key].hasOwnProperty("len")) {
          arr.push(origin_item[key]);
        }
      }
      return arr;
    },

    showCommentList: function(items) {
      let origin_item = items;
      var keys = Object.keys(origin_item);
      let arr = [];
      for (const key of keys) {
        arr.push(origin_item[key]);
      }
      return arr;
    },

    downloadCommentData: function() {
      chrome.storage.local.get("comment", function(item) {
        let origin_item = item.comment.data;
        if (origin_item !== "") {
          let keys = Object.keys(origin_item);
          let output_array = [];
          for (const key of keys) {
            output_array.push(origin_item[key]);
          }
          const fields = [
            { label: "comment_ID", value: "comment_id" },
            { label: "reply_comment_id", value: "reply_comment_id" },
            { label: "user_ID", value: "user_id" },
            { label: "time", value: "time" },
            { label: "name", value: "name" },
            { label: "content", value: "content" },
            { label: "like", value: "like" },
            { label: "level", value: "level" }
          ];
          const json2csvParser = new Parser({ fields });
          const csv = json2csvParser.parse(output_array);
          console.log(csv);
          var hiddenElement = document.createElement("a");
          //encodeURI用來轉為UTF-8編碼
          hiddenElement.href =
            "data:text/csv;charset=utf-8,\uFEFF" + encodeURI(csv);
          hiddenElement.target = "_blank";
          hiddenElement.download = "comment_data.csv";
          hiddenElement.click();
        }

      })
    },

    fetchComment: function() {
      //清除儲存區中的 留言物件
      chrome.storage.local.set({comment: { state: "", data: "" }}, function() {});
      //寫入儲存區key:comment的value
      chrome.storage.local.set({ comment: { state: "fetch_comment", data: "" } }, function() {});
    },

    clearCommentData: function() {
      chrome.storage.local.set({comment: { state: "", data: "" }}, function() {});
    }
  },

  mounted: function() {
    var _this = this;
    //掛載就開始設定資料
    chrome.storage.local.set(
      { comment: { state: "", data: "" }, profile: { data: "", state: "" } },
      function() {
        console.log("set initial");
      }
    );

    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      //更新storage的資料 並(1)到還沒去過的新頁面 或 (2)完成 印出
      chrome.storage.onChanged.addListener(function(changes, namespace) {
        console.log("changes:", changes);
        var storage_keys = Object.keys(changes);
        for (const storage_key of storage_keys) {
          if (storage_key == "comment") {
            //更改的是 留言區
            chrome.storage.local.get("comment", function(item) {
              _this.commentData = item.comment.data;
            });
          } else if (storage_key == "profile") {
            //更改的是 個人頁面區
            chrome.storage.local.get("profile", function(item) {
              //更新profile資料到 vue
              _this.profileData = item.profile.data;

              let origin_item = item.profile.data;
              var keys = Object.keys(origin_item);

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
                } else if (
                  !origin_item[0].hasOwnProperty("len") &&
                  origin_item[key].hasOwnProperty("len")
                ) {
                  //全部完成 開始output
                  let output_items = origin_item;
                  let keys = Object.keys(output_items);
                  for (const key of keys) {
                    if (!output_items[key].hasOwnProperty("len")) {
                      let item_data = output_items[key].data;
                      let ID = item_data.ID;
                      let name = item_data.name;
                      let img = item_data.img;
                      let items = { ID, name, img };
                      console.log("output item:", items);
                    }
                  }
                  console.log("output all finish");
                  break;
                }
              }
            });
          }
        }
      });

      //確認已經到 新的連結
      chrome.tabs.onUpdated.addListener(function(tabID, changeInfo, tab) {
        //console.log('tabs:', tabs, 'tabID:', tabID);
        if (changeInfo.status == "complete") {
          chrome.storage.local.get("profile", function(item) {
            let origin_item = item.profile.data;
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
                  "start to fetch profile data"
                );
                chrome.storage.local.set({ profile: { data: origin_item } }, function() {});
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
p {
    font-size: 16px;
}
.card{
  margin: 10px;
}
</style>
