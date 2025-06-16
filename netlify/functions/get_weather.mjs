// weather.mjs
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const TAG = 'weather';

const GET_WEATHER_FUNCTION_DESC = {
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": (
            "获取某个地点的天气，用户应提供一个位置，比如用户说杭州天气，参数为：杭州。" +
            "如果用户说的是省份，默认用省会城市。如果用户说的不是省份或城市而是一个地名，默认用该地所在省份的省会城市。" +
            "如果用户没有指明地点，说\"天气怎么样\"，\"今天天气如何\"，location参数为空"
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": "地点名，例如杭州。可选参数，如果不提供则不传",
                },
                "lang": {
                    "type": "string",
                    "description": "返回用户使用的语言code，例如zh_CN/zh_HK/en_US/ja_JP等，默认zh_CN",
                },
            },
            "required": ["lang"],
        },
    },
};

const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36"
};

// 天气代码映射 - https://dev.qweather.com/docs/resource/icons/#weather-icons
const WEATHER_CODE_MAP = {
    "100": "晴",
    "101": "多云",
    "102": "少云",
    "103": "晴间多云",
    "104": "阴",
    "150": "晴",
    "151": "多云",
    "152": "少云",
    "153": "晴间多云",
    "300": "阵雨",
    "301": "强阵雨",
    "302": "雷阵雨",
    "303": "强雷阵雨",
    "304": "雷阵雨伴有冰雹",
    "305": "小雨",
    "306": "中雨",
    "307": "大雨",
    "308": "极端降雨",
    "309": "毛毛雨/细雨",
    "310": "暴雨",
    "311": "大暴雨",
    "312": "特大暴雨",
    "313": "冻雨",
    "314": "小到中雨",
    "315": "中到大雨",
    "316": "大到暴雨",
    "317": "暴雨到大暴雨",
    "318": "大暴雨到特大暴雨",
    "350": "阵雨",
    "351": "强阵雨",
    "399": "雨",
    "400": "小雪",
    "401": "中雪",
    "402": "大雪",
    "403": "暴雪",
    "404": "雨夹雪",
    "405": "雨雪天气",
    "406": "阵雨夹雪",
    "407": "阵雪",
    "408": "小到中雪",
    "409": "中到大雪",
    "410": "大到暴雪",
    "456": "阵雨夹雪",
    "457": "阵雪",
    "499": "雪",
    "500": "薄雾",
    "501": "雾",
    "502": "霾",
    "503": "扬沙",
    "504": "浮尘",
    "507": "沙尘暴",
    "508": "强沙尘暴",
    "509": "浓雾",
    "510": "强浓雾",
    "511": "中度霾",
    "512": "重度霾",
    "513": "严重霾",
    "514": "大雾",
    "515": "特强浓雾",
    "900": "热",
    "901": "冷",
    "999": "未知",
};

// 获取城市信息
async function fetchCityInfo(location, apiKey, apiHost) {
    try {
        const url = `https://${apiHost}/geo/v2/city/lookup?key=${apiKey}&location=${location}&lang=zh`;
        const response = await fetch(url, { headers: HEADERS });
        const data = await response.json();
        return data.location && data.location.length > 0 ? data.location[0] : null;
    } catch (error) {
        console.error('Error fetching city info:', error);
        return null;
    }
}

// 获取天气页面
async function fetchWeatherPage(url) {
    try {
        const response = await fetch(url, { headers: HEADERS });
        if (response.ok) {
            const html = await response.text();
            return cheerio.load(html);
        }
        return null;
    } catch (error) {
        console.error('Error fetching weather page:', error);
        return null;
    }
}

// 解析天气信息
function parseWeatherInfo($) {
    const cityName = $('h1.c-submenu__location').text().trim();
    
    const currentAbstract = $('.c-city-weather-current .current-abstract').text().trim() || '未知';
    
    const currentBasic = {};
    $('.c-city-weather-current .current-basic .current-basic___item').each((index, element) => {
        const text = $(element).text().trim();
        const parts = text.split(' ').filter(part => part.length > 0);
        if (parts.length === 2) {
            const [value, key] = parts;
            currentBasic[key] = value;
        }
    });
    
    const tempsList = [];
    $('.city-forecast-tabs__row').slice(0, 7).each((index, element) => {
        const date = $(element).find('.date-bg .date').text().trim();
        const iconSrc = $(element).find('.date-bg .icon').attr('src') || '';
        const weatherCode = iconSrc.split('/').pop().split('.')[0];
        const weather = WEATHER_CODE_MAP[weatherCode] || '未知';
        
        const temps = [];
        $(element).find('.tmp-cont .temp').each((i, tempEl) => {
            temps.push($(tempEl).text().trim());
        });
        
        const highTemp = temps.length >= 2 ? temps[0] : null;
        const lowTemp = temps.length >= 2 ? temps[temps.length - 1] : null;
        
        tempsList.push([date, weather, highTemp, lowTemp]);
    });
    
    return { cityName, currentAbstract, currentBasic, tempsList };
}

// 获取IP信息（简化版）
async function getIpInfo(clientIp) {
    try {
        const response = await fetch(`http://ip-api.com/json/${clientIp}?lang=zh-CN`);
        const data = await response.json();
        return { city: data.city };
    } catch (error) {
        console.error('Error getting IP info:', error);
        return null;
    }
}

// 主要天气获取函数
export async function getWeather(conn, location = null, lang = 'zh_CN') {
    const config = conn.config?.plugins?.get_weather || {};
    const apiHost = config.api_host || 'mj7p3y7naa.re.qweatherapi.com';
    const apiKey = config.api_key || 'a861d0d5e7bf4ee1a83d9a9e4f96d4da';
    const defaultLocation = config.default_location;
    const clientIp = conn.client_ip;
    
    // 优先使用用户提供的location参数
    if (!location) {
        // 通过客户端IP解析城市
        if (clientIp) {
            const ipInfo = await getIpInfo(clientIp);
            location = ipInfo?.city || defaultLocation;
        } else {
            // 若IP解析失败或无IP，使用默认位置
            location = defaultLocation;
        }
    }
    
    const cityInfo = await fetchCityInfo(location, apiKey, apiHost);
    if (!cityInfo) {
        return {
            action: 'REQLLM',
            text: `未找到相关的城市: ${location}，请确认地点是否正确`,
            data: null
        };
    }
    
    const $ = await fetchWeatherPage(cityInfo.fxLink);
    if (!$) {
        return {
            action: 'REQLLM',
            text: null,
            data: '请求失败'
        };
    }
    
    const { cityName, currentAbstract, currentBasic, tempsList } = parseWeatherInfo($);
    
    let weatherReport = `您查询的位置是：${cityName}\n\n当前天气: ${currentAbstract}\n`;
    
    // 添加有效的当前天气参数
    if (Object.keys(currentBasic).length > 0) {
        weatherReport += '详细参数：\n';
        for (const [key, value] of Object.entries(currentBasic)) {
            if (value !== '0') {  // 过滤无效值
                weatherReport += `  · ${key}: ${value}\n`;
            }
        }
    }
    
    // 添加7天预报
    weatherReport += '\n未来7天预报：\n';
    for (const [date, weather, high, low] of tempsList) {
        weatherReport += `${date}: ${weather}，气温 ${low}~${high}\n`;
    }
    
    // 提示语
    weatherReport += '\n（如需某一天的具体天气，请告诉我日期）';
    
    return {
        action: 'REQLLM',
        text: weatherReport,
        data: null
    };
}

// 导出函数描述符和主函数
export { GET_WEATHER_FUNCTION_DESC };
export default getWeather;

