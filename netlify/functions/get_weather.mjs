// get_weather.mjs - Enhanced with Gemini AI and Traditional Chinese
import { GoogleGenerativeAI } from '@google/generative-ai';

const TAG = 'weather';

// Configuration
const WEATHER_CONFIG = {
    "api_host": "m9487qfrq4.re.qweatherapi.com",
    "api_key": "80f8bafcecfb492f8251b630dcecac35",
    "default_location": "101070101"
};

// Weather code mapping with Traditional Chinese
const WEATHER_CODE_MAP = {
    "100": "晴", "101": "多雲", "102": "少雲", "103": "晴間多雲", "104": "陰",
    "150": "晴", "151": "多雲", "152": "少雲", "153": "晴間多雲",
    "300": "陣雨", "301": "強陣雨", "302": "雷陣雨", "303": "強雷陣雨", 
    "304": "雷陣雨伴有冰雹", "305": "小雨", "306": "中雨", "307": "大雨", 
    "308": "極端降雨", "309": "毛毛雨/細雨", "310": "暴雨", "311": "大暴雨", 
    "312": "特大暴雨", "313": "凍雨", "314": "小到中雨", "315": "中到大雨",
    "316": "大到暴雨", "317": "暴雨到大暴雨", "318": "大暴雨到特大暴雨",
    "350": "陣雨", "351": "強陣雨", "399": "雨",
    "400": "小雪", "401": "中雪", "402": "大雪", "403": "暴雪", 
    "404": "雨夾雪", "405": "雨雪天氣", "406": "陣雨夾雪", "407": "陣雪",
    "408": "小到中雪", "409": "中到大雪", "410": "大到暴雪", 
    "456": "陣雨夾雪", "457": "陣雪", "499": "雪",
    "500": "薄霧", "501": "霧", "502": "霾", "503": "揚沙", "504": "浮塵",
    "507": "沙塵暴", "508": "強沙塵暴", "509": "濃霧", "510": "強濃霧",
    "511": "中度霾", "512": "重度霾", "513": "嚴重霾", "514": "大霧", "515": "特強濃霧",
    "900": "熱", "901": "冷", "999": "未知"
};

const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36"
};

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Helper functions
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

// Enhanced function to generate natural language summary
async function generateNaturalSummary(weatherData) {
   // Debug environment variable
    console.log('Environment check:');
    console.log('GEMINI_API_KEY exists:', !!process.env.GEMINI_API_KEY);
    console.log('GEMINI_API_KEY length:', process.env.GEMINI_API_KEY?.length || 0);
    console.log('GEMINI_API_KEY first 10 chars:', process.env.GEMINI_API_KEY?.substring(0, 10) || 'undefined');
// Check if Gemini is available
      if (!model || !process.env.GEMINI_API_KEY) {
        console.log('Gemini not available - missing API key or model not initialized');
        return null;
    }
    try {
        const { city, current, forecast } = weatherData;
        
        // Create structured prompt for Gemini in Traditional Chinese
        const prompt = `
作為一個專業的天氣播報員，請用自然、友好的語言播報以下天氣信息：

城市：${city}
當前天氣：
- 天氣狀況：${current.text}
- 溫度：${current.temp}°C
- 體感溫度：${current.feelsLike}°C
- 濕度：${current.humidity}%
- 風向風力：${current.windDir} ${current.windScale}級
- 氣壓：${current.pressure}hPa

未來7天預報：
${forecast.map(day => {
    const date = new Date(day.fxDate).toLocaleDateString('zh-TW', { 
        month: 'short', 
        day: 'numeric',
        weekday: 'short'
    });
    return `${date}: ${day.textDay}${day.textDay !== day.textNight ? '轉' + day.textNight : ''}，${day.tempMin}°C~${day.tempMax}°C`;
}).join('\n')}

請用溫馨、專業的語調播報，包含：
1. 問候和當前天氣概況
2. 詳細的當前天氣參數說明
3. 未來幾天的天氣趨勢
4. 實用的生活建議（如穿衣、出行等）
5. 結束語

回覆應該像真實的天氣主播一樣自然流暢，大約200-300字。
`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
        
    } catch (error) {
        console.error('Gemini API error:', error);
        // Fallback to original formatted text
        return null;
    }
}

// Modified getWeather function
async function getWeather(location = null, lang = 'zh_TW') {
    const { api_host, api_key, default_location } = WEATHER_CONFIG;
    
    if (!location) {
        location = default_location;
    }
    
    console.log(`Getting weather for: ${location}`);
    
    const cityInfo = await fetchCityInfo(location, api_key, api_host);
    if (!cityInfo) {
        return {
            success: false,
            summary: `未找到相關的城市: ${location}，請確認地點是否正確`,
            data: null
        };
    }
    
    console.log(`Found city: ${cityInfo.name}, ID: ${cityInfo.id}`);
    
    const currentWeather = await fetchCurrentWeather(cityInfo.id, api_key, api_host);
    if (!currentWeather) {
        return {
            success: false,
            summary: `獲取 ${cityInfo.name} 的當前天氣信息失敗`,
            data: null
        };
    }
    
    const forecast = await fetchWeatherForecast(cityInfo.id, api_key, api_host);
    
    const weatherData = {
        city: cityInfo.name,
        current: currentWeather,
        forecast: forecast
    };
    
    // Generate natural language summary with Gemini
    console.log('Generating natural language summary with Gemini...');
    const naturalSummary = await generateNaturalSummary(weatherData);
    
    // Use Gemini summary if available, otherwise fallback to original
    const finalSummary = naturalSummary || createFallbackSummary(weatherData);
    
    return {
        success: true,
        summary: finalSummary,
        data: weatherData,
        generated_by: naturalSummary ? 'gemini' : 'fallback'
    };
}

// Fallback summary function with Traditional Chinese
function createFallbackSummary(weatherData) {
    const { city, current, forecast } = weatherData;
    
    let weatherReport = `您查詢的位置是：${city}\n\n`;
    weatherReport += `當前天氣: ${current.text}\n`;
    weatherReport += `氣溫: ${current.temp}°C`;
    if (current.feelsLike && current.feelsLike !== current.temp) {
        weatherReport += ` (體感溫度: ${current.feelsLike}°C)`;
    }
    weatherReport += '\n';
    
    weatherReport += '\n詳細參數：\n';
    if (current.humidity) weatherReport += `  · 濕度: ${current.humidity}%\n`;
    if (current.windDir && current.windScale) weatherReport += `  · 風向風力: ${current.windDir} ${current.windScale}級\n`;
    if (current.pressure) weatherReport += `  · 氣壓: ${current.pressure}hPa\n`;
    
    if (forecast && forecast.length > 0) {
        weatherReport += '\n未來7天預報：\n';
        forecast.forEach(day => {
            const date = new Date(day.fxDate).toLocaleDateString('zh-TW', { 
                month: 'short', 
                day: 'numeric',
                weekday: 'short'
            });
            const weather = day.textDay === day.textNight ? day.textDay : `${day.textDay}轉${day.textNight}`;
            weatherReport += `${date}: ${weather}，${day.tempMin}°C~${day.tempMax}°C\n`;
        });
    }
    
    return weatherReport;
}

// Updated Netlify function handler
export default async (request, context) => {
    try {
        console.log('Netlify function called:', request.method);
        
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                }
            });
        }
        
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
        const lang = body.lang || 'zh_TW';
        
        console.log(`Processing weather request for: ${location}`);
        
        // Get weather with Gemini-enhanced summary
        const result = await getWeather(location, lang);
        
        // Return OpenAI-compatible response
        return new Response(JSON.stringify({
            location: result.data?.city || location,
            current_weather: result.data?.current || null,
            forecast: result.data?.forecast || null,
            summary: result.summary,
            success: result.success,
            ai_generated: result.generated_by === 'gemini'
        }), {
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
        
        return new Response(JSON.stringify({
            error: error.message,
            success: false,
            summary: '抱歉，獲取天氣信息時發生錯誤，請稍後重試。'
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
};
