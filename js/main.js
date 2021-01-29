// 取得data
function getRawData() {
    const dataUrl = 'https://raw.githubusercontent.com/kiang/pharmacies/master/json/points.json';
    return new Promise((resolve, reject) => {
        const req = new XMLHttpRequest();
        req.open('get', dataUrl);
        req.send(null);

        req.onload = () => {
            if (req.status === 200) {
                resolve({
                    msg: 'Success!',
                    res: JSON.parse(req.response),
                })
            } else {
                reject({
                    msg: 'Failed!',
                    err: req,
                })
            }
        }
    })
};

getRawData()
    .then(res => {

        // 取得資訊更新時間
        const getTimeFromDate = date => date.toTimeString().slice(0, 8);
        const updateTime = getTimeFromDate(new Date());
        $("#updateTime").text(updateTime);

        // 取得星期幾 -> 購買者分類
        const getDayFromDate = date => date.toString().slice(0, 3);
        const updateDay = getDayFromDate(new Date());
        switch (updateDay) {
            case "Mon":
            case "Wed":
            case "Fri":
                $('#buyerCategory').text("單號");
                break;
            case "Tue":
            case "Thu":
            case "Sat":
                $('#buyerCategory').text("雙號");
                break;
            case "Sun":
                $('#buyerCategory').text('全員');
                break;
            default:
                break;
        };

        /* 取得RAWDATA後要執行的事情 */

        // 整理data
        const rawData = res.res.features;
        const data = getData(rawData);

        // 站內搜尋
        $('#searchSubmit').click(searchForResult);
        let currentSearchList;

        initMap(data); // 初始化地圖

        // 目前渲染藥局列表的長度變數
        let renderNum = 0; // 一開始沒有渲染任何資料

        // 渲染縣市列表
        const counties = getCounties(data)[0];

        let countyString = '<option value="" selected disabled>-- 請選擇縣市 --</option>';
        counties.forEach(c => {
            if (c === "") { return };
            countyString += `<option value="${c}">${c}</option>`
        });
        $('#countySelect').html(countyString);

        // 選擇縣市 -> 渲染此縣市藥局列表
        $('#countySelect').change(function (e) {

            const inputEl = document.querySelector('#searchInput');
            inputEl.value = "";

            const countySelected = $('#countySelect').val();
            const townSelected = null;
            renderNum = 10; // 第一次渲染時固定渲染10筆資料
            // 渲染藥局列表
            getRenderListInfo(countySelected, townSelected, data, renderNum);
        })

        // 選擇完縣市後 => 渲染對應行政區。
        $('#countySelect').change(function (e) {

            let target = e.target.value;
            let townList = [];
            data.forEach(d => {
                if (d.county === target && townList.indexOf(d.town) === -1) {
                    townList.push(d.town);
                }
            });

            let townString = '<option value="" selected disabled>-- 請選行政區 --</option>';
            townList.forEach(t => {
                townString += `<option value="${t}">${t}</option>`
            });
            $('#townSelect').html(townString);
        });

        // 選擇行政區後 => 渲染藥局列表
        $('#townSelect').change(function (e) {

            const inputEl = document.querySelector('#searchInput');
            inputEl.value = "";

            const countySelected = $('#countySelect').val();
            const townSelected = $('#townSelect').val();
            renderNum = 10;
            getRenderListInfo(countySelected, townSelected, data, renderNum);
        });

        // 「查看更多」按鈕
        $('#seeMoreBtn').click(function (e) {
            renderNum += 10; // 查看後10筆資料
            const countySelected = $('#countySelect').val();
            const townSelected = $('#townSelect').val();
            const searchInput = $('#searchInput').val(); // 搜尋框輸入內容

            if (countySelected !== null && townSelected === null && searchInput === '') { // 沒有搜尋 + 只有縣市
                getRenderListInfo(countySelected, townSelected, data, renderNum);
            } else if (townSelected !== null && countySelected !== null && searchInput === '') { // 選擇縣市+行政區 + 沒有搜尋
                getRenderListInfo(countySelected, townSelected, data, renderNum);
            } else if (townSelected === null && countySelected === null && searchInput !== "") { // 沒有select + 搜尋
                let remainNum = (currentSearchList.length - renderNum) > 0 ? (currentSearchList.length - renderNum) : 0;
                renderList(currentSearchList, renderNum, remainNum);
            } else if (townSelected === null && countySelected !== null && searchInput !== "") {
                let remainNum = (currentSearchList.length - renderNum) > 0 ? (currentSearchList.length - renderNum) : 0;
                renderList(currentSearchList, renderNum, remainNum);
            } else if (townSelected !== null && countySelected !== null && searchInput !== "") {
                let remainNum = (currentSearchList.length - renderNum) > 0 ? (currentSearchList.length - renderNum) : 0;
                renderList(currentSearchList, renderNum, remainNum);
            }
        });


        // 站內搜尋
        function searchForResult() {

            const input = document.querySelector('#searchInput').value;
            const inputEl = document.querySelector('#searchInput');

            // 未輸入任何關鍵字
            if (input === "") {
                alert('請輸入關鍵字！');
                return;
            };

            let targetList = [];
            renderNum = 10;
            const county = $('#countySelect').val();
            const town = $('#townSelect').val();

            if (county === null && town === null) { // 全站搜尋

                data.forEach(d => {
                    const dataAddress = d.address;
                    const dataName = d.name;

                    const addressResult = dataAddress.match(input);
                    const nameResult = dataName.match(input);
                    if (addressResult !== null || nameResult !== null) {
                        targetList.push(d);
                    }
                })

                if (targetList.length === 0) {
                    alert("找不到相符內容，請重試！");
                    inputEl.value = "";
                    return;
                };

                currentSearchList = targetList;
                let remainNum = (targetList.length - renderNum) > 0 ? (targetList.length - renderNum) : 0;
                renderList(targetList, renderNum, remainNum);

            } else if (county !== null && town === null) { // 選擇縣市 + 站內搜尋

                data.forEach(d => {
                    const dataAddress = d.address;
                    const dataName = d.name;

                    const addressResult = dataAddress.match(input);
                    const nameResult = dataName.match(input);

                    if (d.county === county) {
                        if (addressResult !== null || nameResult !== null) {
                            targetList.push(d);
                        }
                    };
                })

                if (targetList.length === 0) {
                    alert("找不到相符內容，請重試！");
                    inputEl.value = "";
                    return;
                }

                currentSearchList = targetList;
                let remainNum = (targetList.length - renderNum) > 0 ? (targetList.length - renderNum) : 0;
                renderList(targetList, renderNum, remainNum);


            } else if (county !== null && town !== null) { // 選擇縣市行政區 + 搜尋

                data.forEach(d => {
                    const dataAddress = d.address;
                    const dataName = d.name;

                    const addressResult = dataAddress.match(input);
                    const nameResult = dataName.match(input);

                    if (d.county === county && d.town === town) {
                        if (addressResult !== null || nameResult !== null) {
                            targetList.push(d);
                        }
                    }
                });

                if (targetList.length === 0) {
                    alert('找不到相符內容，請重試！');
                    inputEl.value = "";
                    return;
                };

                currentSearchList = targetList;
                let remainNum = (targetList.length - renderNum) > 0 ? (targetList.length - renderNum) : 0;
                renderList(targetList, renderNum, remainNum);

            }

        }

    })
    .catch(err => {
        console.log(err);
    });


// 取得縣市列表、縣市座標列表
function getCounties(data) {
    let countiesLatlng = new Map();
    let counties = [];
    data.forEach(d => {

        let target = d.county;
        let latlng = d.geometry;
        // 處理「台、臺」問題
        if (target[0] === "台") {
            target = target.replace("台", "臺");
        };
        if (counties.indexOf(target) === -1) {
            countiesLatlng.set(target, latlng);
            counties.push(target);
        };
    });

    return [counties, countiesLatlng];
};

// 取得行政區列表
function getTowns(d) {
    // 取得移除縣市後的字串
    let string = d.properties.address.slice(3, d.properties.address.length);

    if (string[1] === '鎮' || string[1] === '市') {
        return string.slice(0, 3);
    } else {
        let targetIndex = string.search(/[鄉區鎮市]/);
        const targetTown = string.slice(0, targetIndex + 1)
        return targetTown;
    };
}

// 整理data
function getData(rawData) {
    let data = [];

    rawData.forEach(d => {
        const maskAdult = d.properties.mask_adult;
        let adultCardBg = "";
        let adultCardImg = "";
        if (maskAdult >= 100) {
            adultCardBg = "#35787a";
            adultCardImg = "./images/ic_stock_full.png"
        } else if (maskAdult < 100 && maskAdult > 0) {
            adultCardBg = "#e67e31";
            adultCardImg = "./images/ic_stock_few.png"
        } else {
            adultCardBg = "#888888";
            adultCardImg = "./images/ic_stock_none.png"
        };

        const maskChild = d.properties.mask_child;
        let childCardBg = "";
        let childCardImg = "";
        if (maskChild >= 100) {
            childCardBg = "#35787a";
            childCardImg = "./images/ic_stock_full.png"
        } else if (maskChild < 100 && maskChild > 0) {
            childCardBg = "#e67e31";
            childCardImg = "./images/ic_stock_few.png"
        } else {
            childCardBg = "#888888";
            childCardImg = "./images/ic_stock_none.png"
        };

        let targetTown = getTowns(d);
        data.push({
            name: d.properties.name, // 藥局名稱
            county: d.properties.address.slice(0, 3), // 縣市
            town: targetTown, // 行政區
            address: d.properties.address, // 地址
            geometry: d.geometry.coordinates, // 座標
            tel: d.properties.phone, // 電話
            maskAdoult: d.properties.mask_adult, // 成人口罩數
            adultCardBg: adultCardBg,
            adultCardImg: adultCardImg,
            maskChild: d.properties.mask_child, // 兒童口罩數
            childCardBg: childCardBg,
            childCardImg: childCardImg,
            note: d.properties.note, // 備註
        })
    });
    return data;
};

/* 
    渲染藥局列表
    target => county or town
    targetValue => 實際的值（新竹縣、豐原區）
    result每10個一組渲染。
*/
function getRenderListInfo(targetCounty, targetTown, data, renderNum) {

    // 取得目標縣市藥局列表
    let countyTargetList = [];
    data.forEach(d => {
        if (d.county === targetCounty) {
            countyTargetList.push(d);
        };
    });


    if (targetTown === null) {
        let remainNum = (countyTargetList.length - renderNum) > 0 ? (countyTargetList.length - renderNum) : 0;
        renderList(countyTargetList, renderNum, remainNum);
    } else {     // 如果有選取目標行政區
        let townTargetList = [];
        countyTargetList.forEach(c => {
            if (c.town === targetTown) {
                townTargetList.push(c);
            };
        });

        let remainNum = (townTargetList.length - renderNum) > 0 ? (townTargetList.length - renderNum) : 0;
        renderList(townTargetList, renderNum, remainNum);
    }
};

function renderList(targetList, renderNum, remainNum) {


    const searchInput = $('#searchInput').val();
    let listStr = '';

    if (targetList.length <= 10) {
        // 如果 targetList 本來就小於等於10 => 直接渲染整個列表。
        targetList.forEach(li => {
            listStr +=
                `
        <li class="result searchable" data-title="${li.name} ${li.address}">
    
        <div class="result-cards">
    
            <div class="result-card adult-card" style="background-color: ${li.adultCardBg}">
                <p class="card-text">成人口罩數量</p>
                <p class="mask-left"><span class="mask-number">${li.maskAdoult}</span>片</p>
                <img src="${li.adultCardImg}" alt="" class="result-card-img">
            </div>
    
            <div class="result-card child-card" style="background-color: ${li.childCardBg}">
                <p class="card-text">兒童口罩數量</p>
                <p class="mask-left"><span class="mask-number">${li.maskChild}</span>片</p>
                <img src="${li.childCardImg}" alt="" class="result-card-img">
            </div>
        </div>
    
        <p class="result-name" id="resultName">
            ${li.name}
            <span class="result-distance" id="resultDistance"></span>
        </p>
    
        <ul class="result-info-list">
    
            <li class="result-location">
                <span class="result-location-label">地址</span>
                ${li.address}
                <a href="" class="result-on-map"><i id="resultOnMap" data-lng="${li.geometry[0]}" data-lat="${li.geometry[1]}" class="fas fa-map-pin"></i></a>
            </li>
    
            <li class="result-tel">
                <span class="result-tel-label">電話</span>
                ${li.tel}
            </li>
    
            <li class="result-note">
                <span class="result-note-label">備註</span>
                ${li.note}
            </li>
        </ul>
    
    </li>
        `
        });
        // 「尚有0筆」
        $('#notShowResultNum').html(0);
        // 隱藏「查看更多」按鈕
        $('#seeMoreBtn').css('visibility', 'hidden');

    } else if (targetList.length > 10 && remainNum !== 0) {

        for (let i = 0; i < renderNum; i++) {
            listStr +=
                `
                    <li class="result searchable" data-title="${targetList[i].name} ${targetList[i].address}">
    
                    <div class="result-cards">
    
                        <div class="result-card adult-card" style="background-color: ${targetList[i].adultCardBg}">
                            <p class="card-text">成人口罩數量</p>
                            <p class="mask-left"><span class="mask-number">${targetList[i].maskAdoult}</span>片</p>
                            <img src="${targetList[i].adultCardImg}" alt="" class="result-card-img">
                        </div>
    
                        <div class="result-card child-card" style="background-color: ${targetList[i].childCardBg}">
                            <p class="card-text">兒童口罩數量</p>
                            <p class="mask-left"><span class="mask-number">${targetList[i].maskChild}</span>片</p>
                            <img src="${targetList[i].childCardImg}" alt="" class="result-card-img">
                        </div>
                    </div>
    
                    <p class="result-name" id="resultName">
                        ${targetList[i].name}
                        <span class="result-distance" id="resultDistance"></span>
                    </p>
    
                    <ul class="result-info-list">
    
                        <li class="result-location">
                            <span class="result-location-label">地址</span>
                            ${targetList[i].address}
                            <a href="" class="result-on-map"><i id="resultOnMap" data-lng="${targetList[i].geometry[0]}" data-lat="${targetList[i].geometry[1]}" class="fas fa-map-pin"></i></a>
                        </li>
    
                        <li class="result-tel">
                            <span  class="result-tel-label">電話</span>
                            ${targetList[i].tel}
                        </li>
    
                        <li class="result-note">
                            <span class="result-note-label">備註</span>
                            ${targetList[i].note}
                        </li>
                    </ul>
    
                    </li>
                `
        };
        // 「尚有Ｘ筆」
        $('#notShowResultNum').html(remainNum);

        // 「查看後Ｘ筆」
        if (remainNum > 10) {
            $('#seeMoreBtn').text('查看後 10 筆');
            $('#seeMoreBtn').css('visibility', 'visible');
        } else if (remainNum > 0 && remainNum < 10) {
            $('#seeMoreBtn').text(`查看後 ${remainNum} 筆`);
            $('#seeMoreBtn').css('visibility', 'visible');
        };

    } else if (targetList.length > 10 && remainNum === 0) {
        targetList.forEach(li => {
            listStr +=
                `
        <li class="result searchable" data-title="${li.name} ${li.address}">
    
        <div class="result-cards">
    
            <div class="result-card adult-card" style="background-color: ${li.adultCardBg}">
                <p class="card-text">成人口罩數量</p>
                <p class="mask-left"><span class="mask-number">${li.maskAdoult}</span>片</p>
                <img src="${li.adultCardImg}" alt="" class="result-card-img">
            </div>
    
            <div class="result-card child-card" style="background-color: ${li.childCardBg}">
                <p class="card-text">兒童口罩數量</p>
                <p class="mask-left"><span class="mask-number">${li.maskChild}</span>片</p>
                <img src="${li.childCardImg}" alt="" class="result-card-img">
            </div>
        </div>
    
        <p class="result-name" id="resultName">
            ${li.name}
            <span class="result-distance" id="resultDistance"></span>
        </p>
    
        <ul class="result-info-list">
    
            <li class="result-location">
                <span class="result-location-label">地址</span>
                ${li.address}
                <a href="" class="result-on-map"><i id="resultOnMap" data-lng="${li.geometry[0]}" data-lat="${li.geometry[1]}" class="fas fa-map-pin"></i></a>
            </li>
    
            <li class="result-tel">
                <span class="result-tel-label">電話</span>
                ${li.tel}
            </li>
    
            <li class="result-note">
                <span class="result-note-label">備註</span>
                ${li.note}
            </li>
        </ul>
    
    </li>
        `
        });
        // 「尚有0筆」
        $('#notShowResultNum').html(0);
        // 隱藏「查看更多」按鈕
        $('#seeMoreBtn').css('visibility', 'hidden');
    };


    $('#resultList').html(listStr);
    adjustFooter(); // 確保layout不會破版
    // searchInput();
};

/* ========== 使用介面 ========== */

// header-menu toggle
$("#headerMenuSwitch").click(function (e) {
    $('.header').toggleClass('show-menu');
})

// 收合側邊欄
$('#asideSwitch').click(function (e) {
    $('.content').toggleClass('aside-close');
    $('.content').toggleClass('aside-open');
})

// 回到頂端按鈕
$('#btns').click(function (e) {
    e.preventDefault();
    if (e.target.hash === "#topSection") {
        const item = e.target.hash;
        const target = ($(item).offset().top) - 50;
        const duration = 800;
        $('#scrollSection').animate({
            scrollTop: target
        }, duration)
    } else {
        return;
    }
});

// overflow: scroll → 動態取得裝置高度。
(function () {

    adjustFooter();

    const height = window.innerHeight;
    $('#map').css('height', height);
    $('#scrollSection').css('height', height);
})();

// 當裝置高度 > 800px時會破版 → 動態調整版面
function adjustFooter() {
    const height = window.innerHeight;
    const width = window.innerWidth;
    const resultSearchable = document.querySelector('.searchable'); // 有


    if (width > 768 && (resultSearchable === null)) {
        $('.footer').css('position', 'absolute');
        $('.footer').css('bottom', '0px');
    } else if (width > 768 && (resultSearchable !== null)) {
        $('.footer').css('position', 'relative');
    }
};

// 重新載入
$('#reloadBtn').click(function () {
    window.location.reload();
})

// 初始化地圖Fn
function initMap(data) {

    let map, infoWindow, currentPositionMarker;

    /* 地圖相關設定 */
    let defaultLatLng = { lat: 25.037046, lng: 121.5390098 };
    let mapContainer = document.querySelector('#map');
    let mapOption = {
        center: defaultLatLng, // Taipei
        zoom: 13,
        noClear: true,
        streetViewControl: false,
    };

    map = new google.maps.Map(mapContainer, mapOption);
    infoWindow = new google.maps.InfoWindow();

    // 取得裝置目前所在位置
    getUserLocation()
        .then(res => {
            const pos = res.res;

            // 設定圖標
            currentPositionMarker = new google.maps.Marker({
                position: pos,
                map: map,
                animation: google.maps.Animation.DROP
            })

            // 設定資訊框
            infoWindow.setPosition(pos);
            infoWindow.setContent('Your Position');

            map.setCenter(pos);
            getAllMarkers(pos);
        })
        .catch(err => {
            console.log(err);
            handleLocationError(true, infoWindow, map.getCenter());
            getAllMarkers(null);
        })

    // 無法定位時：顯示錯誤
    function handleLocationError(browserHasGeolocation, infoWindow, pos) {
        infoWindow.setPosition(pos);
        infoWindow.setContent(
            browserHasGeolocation
                ? '<p class="get-position-error">出現錯誤：定位失敗</p>'
                : '<p class="get-position-error">出現錯誤：您的裝置不支援定位功能。</p>'
        );
        infoWindow.open(map);
    }

    // 渲染裝置附近藥局圖標 → 使用 marker cluster
    // 取得所有藥局座標
    function getAllMarkers(pos) {

        // 儲存所有藥局的座標
        const locations = [];
        data.forEach(d => {
            const location = { lat: d.geometry[1], lng: d.geometry[0] };
            locations.push(location);
        });

        // 建立所有藥局圖標 (marker)
        const markers = locations.map((location, i) => {

            let marker = new google.maps.Marker({
                position: location,
                icon: "../images/map_pill.png",
                map: map
            });

            // 點擊圖標 -> 顯示藥局口罩資訊
            marker.latlng = location;
            marker.addListener('click', function () {

                if (pos) { // 有取得使用者裝置位置
                    getDistance(pos, location)
                        .then(res => {
                            const distance = res.distance; // 點擊的藥局和使用者裝置的距離
                            marker.distance = distance;

                            // 取得點擊的藥局資訊
                            let clickedMarkerLatLng = [marker.latlng.lng, marker.latlng.lat];
                            for (let i = 0; i < data.length; i++) {
                                // 比對座標 -> 取得該藥局資訊
                                if (JSON.stringify(data[i].geometry) === JSON.stringify(clickedMarkerLatLng)) {
                                    marker.info = data[i];
                                    break;
                                }
                            };


                            let contentStr =
                                `
                                <div class="clicked-info-window">
                                <h1>${marker.info.name}</h1>
                                <p>成人口罩：${marker.info.maskAdoult}</p>
                                <p>兒童口罩：${marker.info.maskChild}</p>
                                <p>距離：${marker.distance}</p>
                                </div>
                            `;

                            const clickedInfoWindow = new google.maps.InfoWindow({
                                content: contentStr,
                            });
                            clickedInfoWindow.open(map, marker);

                        })
                        .catch(err => { // 計算距離失敗

                            // 取得點擊的藥局資訊
                            let clickedMarkerLatLng = [marker.latlng.lng, marker.latlng.lat];
                            for (let i = 0; i < data.length; i++) {
                                // 比對座標 -> 取得該藥局資訊
                                if (JSON.stringify(data[i].geometry) === JSON.stringify(clickedMarkerLatLng)) {
                                    marker.info = data[i];
                                    break;
                                }
                            };

                            // 設定資訊框內容
                            let contentStr =
                                `
                                <div class="clicked-info-window">
                                <h1>${marker.info.name}</h1>
                                <p>成人口罩：${marker.info.maskAdoult}</p>
                                <p>兒童口罩：${marker.info.maskChild}</p>
                                <p>距離：? km</p>
                                </div>
                            `;

                            const clickedInfoWindow = new google.maps.InfoWindow({
                                content: contentStr,
                            });
                            clickedInfoWindow.open(map, marker);
                        })


                } else { // 不允許儲存使用者裝置位置 or 不支援此功能

                    // 取得點擊的藥局資訊
                    let clickedMarkerLatLng = [marker.latlng.lng, marker.latlng.lat];
                    for (let i = 0; i < data.length; i++) {
                        // 比對座標 -> 取得該藥局資訊
                        if (JSON.stringify(data[i].geometry) === JSON.stringify(clickedMarkerLatLng)) {
                            marker.info = data[i];
                            break;
                        }
                    };

                    let contentStr =
                        `
                        <div class="clicked-info-window">
                        <h1>${marker.info.name}</h1>
                        <p>成人口罩：${marker.info.maskAdoult}</p>
                        <p>兒童口罩：${marker.info.maskChild}</p>
                        <p>距離：? km</p>
                        </div>
                    `;

                    const clickedInfoWindow = new google.maps.InfoWindow({
                        content: contentStr,
                    });
                    clickedInfoWindow.open(map, marker);
                }
            });

            return marker;
        });

        // 新增並使用marker clusters
        new MarkerClusterer(map, markers, {
            imagePath:
                "https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m"
        });
    };

    // 選擇縣市 -> 地圖中心移動至該縣市
    $('#countySelect').change(() => {
        const list = getCounties(data)[1];
        const targetCounty = $('#countySelect').val();
        list.forEach((value, key) => {
            if (targetCounty === key) {
                const latlng = { lat: value[1], lng: value[0] };
                map.setCenter(latlng);
                map.setZoom(10);
            }
        })
    });

    // 選擇行政區 -> 地圖中心移動至該行政區
    $('#townSelect').change(e => {
        let targetCounty = $("#countySelect").val();
        let targetTown = e.target.value;
        for (let i = 0; i < data.length; i++) {
            if (targetCounty === data[i].county && targetTown === data[i].town) {
                let latlng = { lat: data[i].geometry[1], lng: data[i].geometry[0] };
                map.setCenter(latlng);
                map.setZoom(12);
                break;
            };
        };
    })

    // 點擊藥局列表中的地址：
    $('.result-list').delegate('#resultOnMap', 'click', function (e) {
        e.preventDefault();

        const width = window.innerWidth;
        // 側邊欄收合
        if (width <= 768) {
            $('.content').toggleClass('aside-close');
            $('.content').toggleClass('aside-open');
        }

        const lat = Number(e.target.dataset.lat);
        const lng = Number(e.target.dataset.lng);
        const latlng = { lat: lat, lng: lng };
        const latlngArr = [lng, lat];

        let targetClicked, targetInfoWindow;

        // 取得目標藥局資訊
        for (let i = 0; i < data.length; i++) {
            if (JSON.stringify(data[i].geometry) === JSON.stringify(latlngArr)) {
                targetClicked = data[i];
                break;
            };
        };

        // 向使用者要求存取裝置目前位置
        getUserLocation()
            .then(res => { // 順利取得使用者座標
                const pos = res.res;
                return getDistance(pos, latlng); // 計算雙方距離
            })
            .then(res => { // 成功取得雙方距離
                const distance = res.distance;
                targetClicked.distance = distance;
                renderInfowindow(targetClicked.distance);
            })
            .catch(err => { // 無法取得裝置位置
                renderInfowindow(null);
            });

        function renderInfowindow(distance) {

            // 資訊框內容
            let contentStr =
                `
                    <div class="clicked-info-window">
                    <h1>${targetClicked.name}</h1>
                    <p>成人口罩：${targetClicked.maskAdoult}</p>
                    <p>兒童口罩：${targetClicked.maskChild}</p>
                    <p>距離：${distance ? distance : "?"}</p>
                    </div>
                `;


            // 設置圖標
            let addressMarker = new google.maps.Marker({
                position: latlng,
                map: map,
                animation: google.maps.Animation.DROP
            });

            targetInfoWindow = new google.maps.InfoWindow({
                content: contentStr,
            })
            targetInfoWindow.open(map, addressMarker);
            // 將地圖移動至該圖標
            map.setCenter(latlng);
            map.setZoom(16);
        }

    });
};

// 取得使用者裝置位置
function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                position => {
                    const pos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };

                    resolve({
                        res: pos
                    })
                },

                // 使用者不允許存取其位置、其他錯誤
                () => {
                    reject({
                        err: '無法取得裝置位置'
                    })
                });

        } else {
            // 瀏覽器不支援Geolocation
            reject({
                err: "不支援此功能"
            })
        };
    })
};

// 計算距離
function getDistance(pos, des) {
    return new Promise((resolve, reject) => {
        const service = new google.maps.DistanceMatrixService();
        service.getDistanceMatrix({
            origins: [pos],
            destinations: [des],
            travelMode: 'TRANSIT', // 如果設定"DRIVING"，離島的部分會出錯。
        }, (response, status) => {
            console.log('[取得距離_status]', status);
            console.log('[typeof status]', typeof status);
            if (status === "OK") {
                resolve({
                    res: response,
                    distance: response.rows[0].elements[0].distance.text,
                })
            } else {
                reject({
                    err: response
                });
            };
        });
    })
};