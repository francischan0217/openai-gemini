// weather.mjs - Cloudflare Workers Compatible Version
const TAG = 'weather';

// Built-in configuration
const WEATHER_CONFIG = {
    "api_host": "devapi.qweather.com", // Updated to use official API
    "api_key": "a861d0d5e7bf4ee1a83d9a9e4f96d4da",
    "default_location": "香港"
};

const GET_WEATHER_FUNCTION_DESC = {
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": "获取某个地点的天气，用户应提供一个位置，比如用户说杭州天气，参数为：杭州。",
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

// 获取城市信息
async function fetchCityInfo(location, apiKey, apiHost) {
    try {
        const url = `https://${apiHost}/v2/city/lookup?key=${apiKey}&location=${location}&lang=zh`;
        console.log(`Fetching city info from: ${url}`);
        
        const response = await fetch(url, { 
            headers: HEADERS,
            cf: {
                cacheTtl: 300, // Cache for 5 minutes in Cloudflare
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

// 获取当前天气信息
async function fetchCurrentWeather(locationId, apiKey, apiHost) {
    try {
        const url = `https://${apiHost}/v7/weather/now?key=${apiKey}&location=${locationId}&lang=zh`;
        console.log(`Fetching current weather from: ${url}`);
        
        const response = await fetch(url, { 
            headers: HEADERS,
            cf: {
                cacheTtl: 600, // Cache for 10 minutes
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

// 获取7天天气预报
async function fetchWeatherForecast(locationId, apiKey, apiHost) {
    try {
        const url = `https://${apiHost}/v7/weather/7d?key=${apiKey}&location=${locationId}&lang=zh`;
        console.log(`Fetching forecast from: ${url}`);
        
        const response = await fetch(url, { 
            headers: HEADERS,
            cf: {
                cacheTtl: 1800, // Cache for 30 minutes
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

// 主要天气获取函数
export async function getWeather(location = null, lang = 'zh_CN') {
    const { api_host, api_key, default_location } = WEATHER_CONFIG;
    
    // 如果没有提供位置，使用默认位置
    if (!location) {
        location = default_location;
    }
    
    console.log(`Getting weather for: ${location}`);
    
    // Step 1: 获取城市信息
    const cityInfo = await fetchCityInfo(location, api_key, api_host);
    if (!cityInfo) {
        return {
            action: 'REQLLM',
            text: `未找到相关的城市: ${location}，请确认地点是否正确`,
            data: null
        };
    }
    
    console.log(`Found city: ${cityInfo.name}, ID: ${cityInfo.id}`);
    
    // Step 2: 获取当前天气
    const currentWeather = await fetchCurrentWeather(cityInfo.id, api_key, api_host);
    if (!currentWeather) {
        return {
            action: 'REQLLM',
            text: `获取 ${cityInfo.name} 的当前天气信息失败`,
            data: null
        };
    }
    
    // Step 3: 获取7天预报
    const forecast = await fetchWeatherForecast(cityInfo.id, api_key, api_host);
    
    // 构建天气报告
    let weatherReport = `您查询的位置是：${cityInfo.name}\n\n`;
    
    // 当前天气
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
    
    // 详细参数
    weatherReport += '\n详细参数：\n';
    if (humidity) weatherReport += `  · 湿度: ${humidity}%\n`;
    if (windDir && windScale) weatherReport += `  · 风向风力: ${windDir} ${windScale}级\n`;
    if (pressure) weatherReport += `  · 气压: ${pressure}hPa\n`;
    
    // 7天预报
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

// Helper functions
export function updateWeatherConfig(newConfig) {
    Object.assign(WEATHER_CONFIG, newConfig);
}

export function getWeatherConfig() {
    return { ...WEATHER_CONFIG };
}

export { GET_WEATHER_FUNCTION_DESC };
export default getWeather;
