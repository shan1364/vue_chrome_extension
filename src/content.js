//https://www.facebook.com/pcyeh.NTU, https://www.facebook.com/profile.php?id=100000543132185, https://www.facebook.com/shu.w.zhengwei,https://www.facebook.com/profile.php?id=100005030224189

const delay = (time) => {
    return new Promise((resolve) => {
        window.setTimeout(resolve, time);
        console.log('wait', time);
    });
}

function getProfile() {
    let ID = document.querySelector('.profilePicThumb') == null ?
        'not found' : document.querySelector('.profilePicThumb').href.split('=').slice(-1).join('');
    let name = document.querySelector('.profilePicThumb>img') == null ?
        'not found' : document.querySelector('.profilePicThumb>img').alt.split("'s Profile Photo")[0];
    let img = document.querySelector('.profilePicThumb>img') == null ?
        'not found' : document.querySelector('.profilePicThumb>img').src;
    let return_item = { ID, name, img };
    //console.log(return_item);
    return return_item;
}

function getComment() {
    let comment_arr = [];
    let comments = document.querySelector('.fbPhotosSnowliftFeedback').nextElementSibling.querySelector('h6').parentElement.querySelectorAll('.clearfix');
    
    let index = 1;
    for(let i=0; i < comments.length; i++) {
        //沒有timestamp表示不是留言
        if((comments[i].querySelector('.livetimestamp')) !== null) {
            var comment_span = comments[i].querySelectorAll('div')[3].querySelectorAll('span').length;
            if(comments[i].querySelectorAll('div')[3].querySelectorAll('span')[0].innerText == '' && comment_span<3) continue;
            else {
                let regex_arr = [];
                let content = comments[i].querySelectorAll('div')[3].innerText.replace(/(\r\n|\n|\r)/gm, "").trim();
                let user_name = comments[i].querySelectorAll('div')[3].querySelector('a').innerText;                let name_regex = '^' + user_name; regex_arr.push(name_regex);
                let str = 'Hide or report this' + '$'; regex_arr.push(str);
                let content_regex = new RegExp(regex_arr.join("|"),"gmi"); 
                //console.log(content_regex);
                let content_filter = content.replace(content_regex, '');
                let comment_content = content_filter.replace(/(\r\n|\n|\r)/gm, "").trim();                

                var level_text = comments[i].getAttribute('aria-label');
                if (level_text.search(/reply/i) >= 0) var level = 2;
                else var level = 1;
                var comment_obj = { id: index, user: user_name, content: comment_content, level: level };
                //console.log(i, comment_obj);
                comment_arr.push(comment_obj);  
                index++;     
            }
            
        }

    }
    let expand_obj = { ...comment_arr };
    //console.log(expand_obj);
    return expand_obj;
}

async function clickComments() {
    while (true) {
        let comment_area = document.querySelector('.fbPhotosSnowliftFeedback').nextElementSibling.querySelector('h6').parentElement;
        let all_span = comment_area.querySelectorAll('span');
        //確定都已經點開
        let origin_len = comment_area.querySelectorAll('.clearfix').length;
        let count = 0;
        for (let i = 0; i < all_span.length; i++) {
            if (all_span[i].innerText.search('more comment') >= 0 || all_span[i].innerText.search('replied') >= 0 || all_span[i].innerText.search('more reply') >= 0 || all_span[i].innerText.search('more replies') >= 0) {
                all_span[i].click();
                await delay(1500);
                var check_count = 0;
                while(true) {
                    var last_len = comment_area.querySelectorAll('.clearfix').length;
                    if(origin_len !== last_len || check_count>=20) break;
                    else check_count++;
                }
                count++;
                console.log('click:', i);
            }
        }
        if (count == 0 || check_count>=20) return;
    }
}

function check_comments() {
    let comment_ele = (document.querySelector('.fbPhotosSnowliftFeedback')==null) ? false: ( (document.querySelector('.fbPhotosSnowliftFeedback').nextElementSibling==null) ? false : document.querySelector('.fbPhotosSnowliftFeedback').nextElementSibling.querySelector('h6') ==null? false: document.querySelector('.fbPhotosSnowliftFeedback').nextElementSibling.querySelector('h6').parentElement ==null? false: true);
    console.log('check:', comment_ele);
    return comment_ele;
}

async function wait_comments() {
    let check_ele = await check_comments();
    if(!check_ele) {
        chrome.storage.sync.set({ comment: {state: '', data: '' }}, function() { });
    }else{
        await clickComments();
        let comment_item = await getComment();
        chrome.storage.sync.set({ comment: {state: 'finish', data: comment_item }}, function() { });
    }   
}

chrome.storage.onChanged.addListener(function (changes, namespace) {
    console.log('changes:', changes);
    var storage_keys = Object.keys(changes);
    for(const storage_key of storage_keys) {
        //console.log('change keys:', storage_key);
        if(storage_key == 'comment') { //更改的是 留言區
            chrome.storage.sync.get('comment', function (data) {
                //console.log('origin comment storage data:', data);
                if(data.comment.state == 'fetch_comment') {
                     wait_comments();
                }
               
            })
        } else if(storage_key == 'profile') { //更改的是 個人頁面區
            chrome.storage.sync.get('profile', function (item) {
                //console.log('origin  profile storage data:', data);
                let storage_profile_data = item.profile.data;
                let storage_profile_keys = Object.keys(storage_profile_data);
                for (const key of storage_profile_keys) { //state == 'fetch' 代表要去 當下連結 爬取資料
                    if (!storage_profile_data[key].hasOwnProperty('len') && storage_profile_data[key].state == 'fetch') {
                        let profile_item = getProfile();
                        var current_url = location.href;
                        storage_profile_data[key].data = profile_item;
                        storage_profile_data[key].state = 'finish';
                        console.log('now url:', current_url, ', insert data:', storage_profile_data[key]);
                        chrome.storage.sync.set({ profile: { data: storage_profile_data } }, function () { });
                        break;
                    }

                }        
            })

        }
    }
})