// get_weather.mjs - Complete Netlify Function Implementation
const TAG = 'weather';

// Built-in configuration
const WEATHER_CONFIG = {
    "api_host": "devapi.qweather.com",
    "api_key": "a861d0d5e7bf4ee1a83d9a9e4f96d4da",
    "default_location": "香港"
};

const WEATHER_CODE_MAP = {
    "100": "晴", "101": "多云", "102": "少云", "103": "晴间多云", "104": "阴",
    "150": "晴", "151": "多云", "152": "少云", "153": "晴间多云",
    "300": "阵雨", "301": "强阵雨", "302": "雷阵雨", "303": "强雷阵雨", 
    "304": "雷阵雨伴有冰雹", "305": "小雨", "306": "中雨", "307": "大雨", 
    "308": "极端降雨", "309": "毛毛雨/细雨", "310": "暴雨", "311": "大暴雨", 
    "312": "特大暴雨", "313": "冻雨", "314": "小到中雨", "315": "中到大雨",
    "316": "大到暴雨", "317": "暴雨到大暴雨", "318": "大暴雨到特大暴雨",
    "350": "阵雨", "351": "强阵雨", "399": "雨",
    "400": "小雪", "401": "中雪", "402": "大雪", "403": "暴雪", 
    "404": "雨夹雪", "405": "雨雪天气", "406": "阵雨夹雪", "407": "阵雪",
    "408": "小到中雪", "409": "中到大雪", "410": "大到暴雪", 
    "456": "阵雨夹雪", "457": "阵雪", "499": "雪",
    "500": "薄雾", "501": "雾", "502": "霾", "503": "扬沙", "504": "浮尘",
    "507": "沙尘暴", "508": "强沙尘暴", "509": "浓雾", "510": "强浓雾",
    "511": "中度霾", "512": "重度霾", "513": "严重霾", "514": "大雾", "515": "特强浓雾",
    "900": "热", "901": "冷", "999": "未知"
};

const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36"
};

// Your existing helper functions (keep all of them)
async function fetchCityInfo(location, apiKey, apiHost) {
    try {
        const encodedLocation = encodeURIComponent(location);
        const url = `https://${apiHost}/geo/v2/city/lookup?key=${apiKey}&location=${location}&lang=zh`;
        console.log(`Fetching city info from: ${url}`);
        
        const response = await fetch(url, { 
            headers: HEADERS,
            cf: {
                cacheTtl: 300,
                cacheEverything: true
            }
        });
        
        if (!response.ok) {
            console.error(`City API error: ${response.status} ${response.statusText}`);
            return null;
        }
        
        const data = await response.json();
        console.log('City API response:', data);
        
        if (data.code !== "200") {
            console.error(`API error code: ${data.code}`);
            return null;
        }
        
        return data.location && data.location.length > 0 ? data.location[0] : null;
    } catch (error) {
        console.error('Error fetching city info:', error);
        return null;
    }
}

async function fetchCurrentWeather(locationId, apiKey, apiHost) {
    try {
        const url = `https://${apiHost}/v7/weather/now?key=${apiKey}&location=${locationId}&lang=zh`;
        console.log(`Fetching current weather from: ${url}`);
        
        const response = await fetch(url, { 
            headers: HEADERS,
            cf: {
                cacheTtl: 600,
                cacheEverything: true
            }
        });
        
        if (!response.ok) {
            console.error(`Weather API error: ${response.status} ${response.statusText}`);
            return null;
        }
        
        const data = await response.json();
        console.log('Current weather response:', data);
        
        return data.code === "200" ? data.now : null;
    } catch (error) {
        console.error('Error fetching current weather:', error);
        return null;
    }
}

async function fetchWeatherForecast(locationId, apiKey, apiHost) {
    try {
        const url = `https://${apiHost}/v7/weather/7d?key=${apiKey}&location=${locationId}&lang=zh`;
        console.log(`Fetching forecast from: ${url}`);
        
        const response = await fetch(url, { 
            headers: HEADERS,
            cf: {
                cacheTtl: 1800,
                cacheEverything: true
            }
        });
        
        if (!response.ok) {
            console.error(`Forecast API error: ${response.status} ${response.statusText}`);
            return null;
        }
        
        const data = await response.json();
        console.log('Forecast response:', data);
        
        return data.code === "200" ? data.daily : null;
    } catch (error) {
        console.error('Error fetching forecast:', error);
        return null;
    }
}

// Your existing getWeather function (keep as is)
async function getWeather(location = null, lang = 'zh_CN') {
    const { api_host, api_key, default_location } = WEATHER_CONFIG;
    
    if (!location) {
        location = default_location;
    }
    
    console.log(`Getting weather for: ${location}`);
    
    const cityInfo = await fetchCityInfo(location, api_key, api_host);
    if (!cityInfo) {
        return {
            action: 'REQLLM',
            text: `未找到相关的城市: ${location}，请确认地点是否正确`,
            data: null
        };
    }
    
    console.log(`Found city: ${cityInfo.name}, ID: ${cityInfo.id}`);
    
    const currentWeather = await fetchCurrentWeather(cityInfo.id, api_key, api_host);
    if (!currentWeather) {
        return {
            action: 'REQLLM',
            text: `获取 ${cityInfo.name} 的当前天气信息失败`,
            data: null
        };
    }
    
    const forecast = await fetchWeatherForecast(cityInfo.id, api_key, api_host);
    
    let weatherReport = `您查询的位置是：${cityInfo.name}\n\n`;
    
    const currentTemp = currentWeather.temp;
    const currentCondition = WEATHER_CODE_MAP[currentWeather.icon] || currentWeather.text;
    const feelsLike = currentWeather.feelsLike;
    const humidity = currentWeather.humidity;
    const windDir = currentWeather.windDir;
    const windScale = currentWeather.windScale;
    const pressure = currentWeather.pressure;
    
    weatherReport += `当前天气: ${currentCondition}\n`;
    weatherReport += `气温: ${currentTemp}°C`;
    if (feelsLike && feelsLike !== currentTemp) {
        weatherReport += ` (体感温度: ${feelsLike}°C)`;
    }
    weatherReport += '\n';
    
    weatherReport += '\n详细参数：\n';
    if (humidity) weatherReport += `  · 湿度: ${humidity}%\n`;
    if (windDir && windScale) weatherReport += `  · 风向风力: ${windDir} ${windScale}级\n`;
    if (pressure) weatherReport += `  · 气压: ${pressure}hPa\n`;
    
    if (forecast && forecast.length > 0) {
        weatherReport += '\n未来7天预报：\n';
        forecast.forEach(day => {
            const date = new Date(day.fxDate).toLocaleDateString('zh-CN', { 
                month: 'short', 
                day: 'numeric',
                weekday: 'short'
            });
            const dayWeather = WEATHER_CODE_MAP[day.iconDay] || day.textDay;
            const nightWeather = WEATHER_CODE_MAP[day.iconNight] || day.textNight;
            const weather = dayWeather === nightWeather ? dayWeather : `${dayWeather}转${nightWeather}`;
            
            weatherReport += `${date}: ${weather}，${day.tempMin}°C~${day.tempMax}°C\n`;
        });
    }
    
    weatherReport += '\n（如需某一天的具体天气，请告诉我日期）';
    
    return {
        action: 'REQLLM',
        text: weatherReport,
        data: {
            city: cityInfo.name,
            current: currentWeather,
            forecast: forecast
        }
    };
}

// ✅ THIS IS THE CRITICAL ADDITION - PROPER NETLIFY FUNCTION HANDLER
export default async (request, context) => {
    try {
        console.log('Netlify function called:', request.method);
        
        // Parse request body
        let body = {};
        if (request.method === 'POST') {
            const text = await request.text();
            if (text) {
                body = JSON.parse(text);
            }
        }
        
        // Extract parameters
        const location = body.location || null;
        const lang = body.lang || 'zh_CN';
        
        console.log(`Processing weather request for: ${location}`);
        
        // Call your existing weather function
        const result = await getWeather(location, lang);
        
        // Return proper Response object format
        return new Response(JSON.stringify(result), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        });
        
    } catch (error) {
        console.error('Function error:', error);
        
        // Return proper error response
        return new Response(JSON.stringify({
            action: 'REQLLM',
            text: '天气查询服务暂时不可用，请稍后再试',
            data: null,
            error: error.message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
};
