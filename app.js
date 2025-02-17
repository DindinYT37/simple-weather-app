// DOM Elements
const searchBtn = document.getElementById('search');
const locationInput = document.getElementById('location');
const devToggle = document.getElementById('dev-toggle');
const devMenu = document.querySelector('.dev-menu');
const devWeather = document.getElementById('dev-weather');
const devWind = document.getElementById('dev-wind');
const devHumidity = document.getElementById('dev-humidity');
const devApply = document.getElementById('dev-apply');

// API Calls
async function getCoordinates(city) {
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${city}&count=1`);
    const data = await response.json();
    return data.results?.[0];
}

async function getWeather(lat, lon) {
    const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,windspeed_10m`
    );
    return await response.json();
}

async function updateWeather() {
    try {
        const city = locationInput.value;
        const coords = await getCoordinates(city);
        
        if (!coords) {
            alert('City not found!');
            return;
        }

        const weather = await getWeather(coords.latitude, coords.longitude);
        
        document.getElementById('location-name').textContent = coords.name;
        document.getElementById('temperature').textContent = 
            Math.round(weather.current_weather.temperature);
        document.getElementById('wind-speed').textContent = 
            `${Math.round(weather.current_weather.windspeed)} km/h`;
        
        const currentHour = new Date().getHours();
        document.getElementById('humidity').textContent = 
            `${weather.hourly.relativehumidity_2m[currentHour]}%`;
        
        const weatherCode = weather.current_weather.weathercode;
        const windSpeed = weather.current_weather.windspeed;
        
        updateWeatherAnimation(weatherCode, windSpeed);
        document.getElementById('condition').textContent = getWeatherCondition(weatherCode);
    } catch (error) {
        console.error('Error fetching weather:', error);
        alert('Error fetching weather data!');
    }
}

function getWeatherCondition(code) {
    const conditions = {
        0: 'Clear sky',
        1: 'Mainly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Foggy',
        48: 'Depositing rime fog',
        51: 'Light drizzle',
        53: 'Moderate drizzle',
        55: 'Dense drizzle',
        61: 'Slight rain',
        63: 'Moderate rain',
        65: 'Heavy rain',
        71: 'Slight snow',
        73: 'Moderate snow',
        75: 'Heavy snow',
        77: 'Snow grains',
        80: 'Slight rain showers',
        81: 'Moderate rain showers',
        82: 'Violent rain showers',
        85: 'Slight snow showers',
        86: 'Heavy snow showers',
        95: 'Thunderstorm'
    };
    return conditions[code] || 'Unknown';
}

// Weather state updates
function updateWeatherAnimation(code, windSpeed) {
    document.body.classList.remove('clear', 'cloudy', 'rainy', 'snowy', 'windy');
    
    const oldLayer = document.querySelector('.weather-layer');
    if (oldLayer) oldLayer.remove();
    
    const weatherLayer = document.createElement('div');
    weatherLayer.className = 'weather-layer';
    document.body.appendChild(weatherLayer);
    
    if (code === 0) {
        document.body.classList.add('clear');
        const sun = document.createElement('div');
        sun.className = 'sun';
        weatherLayer.appendChild(sun);
    } 
    else if (code === 2) {
        document.body.classList.add('cloudy');
        const cloudCoverage = document.getElementById('dev-cloud-intensity')?.value || 'broken';
        createClouds(weatherLayer, windSpeed, false, cloudCoverage);
    }
    else if (code === 3) {
        document.body.classList.add('cloudy');
        createClouds(weatherLayer, windSpeed, false, 'heavy');
    }
    else if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) {
        document.body.classList.add('rainy');
        const intensity = getCurrentRainIntensity();
        
        const rainWeatherContainer = document.createElement('div');
        rainWeatherContainer.className = 'rain-weather-container';
        weatherLayer.appendChild(rainWeatherContainer);
        
        createClouds(rainWeatherContainer, windSpeed, true, 'overcast');
        createRain(rainWeatherContainer, windSpeed);
    }
}

// Rendering functions
function createClouds(container, windSpeed, isRaining = false, cloudCoverage = 'broken') {
    const cloudConfigs = {
        'scattered': { 
            count: 4, 
            layerCount: 1,
            spacing: 40,
            heightOffset: 15,
            scale: 0.7
        },
        'broken': { 
            count: 6,
            layerCount: 2,
            spacing: 25,
            heightOffset: 25,
            scale: 1
        },
        'overcast': { 
            count: 8,
            layerCount: 3,
            spacing: 15,
            heightOffset: 35,
            scale: 1.3
        }
    };

    if (isRaining) {
        const rainIntensity = getCurrentRainIntensity();
        const rainModifiers = {
            'light': { countMult: 1, scaleMult: 1 },
            'moderate': { countMult: 1.5, scaleMult: 1.3 },
            'heavy': { countMult: 2, scaleMult: 1.6 }
        };
        
        const modifier = rainModifiers[rainIntensity];
        cloudConfigs.overcast.count = Math.floor(cloudConfigs.overcast.count * modifier.countMult);
        cloudConfigs.overcast.scale *= modifier.scaleMult;
        cloudConfigs.overcast.spacing = Math.max(10, cloudConfigs.overcast.spacing / modifier.countMult);
    }
    
    const config = cloudConfigs[cloudCoverage];
    const duration = Math.max(20 - Math.pow(windSpeed, 1.5) / 20, 4);
    
    for (let layer = 1; layer <= config.layerCount; layer++) {
        const layerCount = Math.ceil(config.count * (layer === 1 ? 1 : 0.8));
        
        for (let i = 0; i < layerCount; i++) {
            const cloud = document.createElement('div');
            cloud.className = `cloud ${isRaining ? 'dark' : 'white'} ${cloudCoverage} cloud-layer-${layer}`;
            
            if (windSpeed > 25) cloud.classList.add('strong-wind');
            
            if (isRaining) {
                const verticalPosition = -20 + (layer - 1) * 60;
                cloud.style.top = `${verticalPosition}px`;
                
                const speedFactor = Math.max(5, Math.min(15, windSpeed)) / 10;
                const animDuration = duration / speedFactor;
                cloud.style.animation = `cloudMoveRain ${animDuration}s linear infinite`;
                cloud.style.animationDelay = `${-(animDuration * i / layerCount)}s`;
            } else {
                const baseTop = (layer - 1) * config.heightOffset;
                const verticalPosition = baseTop + (i * config.spacing);
                const horizontalOffset = (Math.random() - 0.5) * 20;
                
                cloud.style.top = `${verticalPosition}px`;
                cloud.style.left = `${horizontalOffset}%`;
                cloud.style.animation = `cloudMove ${duration}s linear infinite`;
                cloud.style.animationDelay = `${-duration * i / layerCount}s`;
            }
            
            container.appendChild(cloud);
        }
    }
    
    if (cloudCoverage === 'overcast') {
        container.classList.add('overcast');
    }
}

function createRain(container, windSpeed) {
    const rainContainer = document.createElement('div');
    rainContainer.className = 'rain-container';
    
    const humidity = parseInt(document.getElementById('humidity').textContent);
    if (humidity > 70) {
        rainContainer.classList.add('high-humidity');
    } else if (humidity < 40) {
        rainContainer.classList.add('low-humidity');
    }
    
    container.appendChild(rainContainer);
    
    const baseCount = getRainDropCount(getCurrentRainIntensity());
    const dropCount = baseCount + Math.floor(Math.random() * (baseCount * 0.2));
    
    let animationType;
    if (windSpeed <= 5) {
        animationType = 'rainFall';
    } else if (windSpeed <= 15) {
        animationType = 'rainFallLight';
    } else if (windSpeed <= 30) {
        animationType = 'rainFallMedium';
    } else {
        animationType = 'rainFallHeavy';
    }
    
    for (let i = 0; i < dropCount; i++) {
        const drop = document.createElement('div');
        drop.className = `raindrop ${getCurrentRainIntensity()}`;
        
        const left = Math.random() * 140;
        const duration = Math.max(1.2 - (windSpeed / 60), 0.5) + (Math.random() * 0.2);
        const delay = Math.random() * 2;
        
        drop.style.left = `${left}%`;
        drop.style.animation = `${animationType} ${duration}s linear infinite`;
        drop.style.animationDelay = `${-delay}s`;
        
        rainContainer.appendChild(drop);
    }
}

function getRainDropCount(intensity) {
    switch (intensity) {
        case 'light': return 50;
        case 'moderate': return 200;
        case 'heavy': return 400;
        default: return 200;
    }
}

function getCurrentRainIntensity() {
    const devIntensity = document.getElementById('dev-rain-intensity');
    return devIntensity ? devIntensity.value : 'moderate';
}

// Event handlers
devToggle.addEventListener('click', () => {
    devMenu.classList.toggle('active');
});

devWind.addEventListener('input', () => {
    document.getElementById('dev-wind-value').textContent = `${devWind.value} km/h`;
});

devHumidity.addEventListener('input', () => {
    document.getElementById('dev-humidity-value').textContent = `${devHumidity.value}%`;
});

devApply.addEventListener('click', () => {
    const weatherType = devWeather.value;
    const windSpeed = parseInt(devWind.value);
    const humidity = parseInt(devHumidity.value);
    const rainIntensity = document.getElementById('dev-rain-intensity')?.value || 'moderate';
    const cloudIntensity = document.getElementById('dev-cloud-intensity')?.value || 'moderate';
    
    document.getElementById('wind-speed').textContent = `${windSpeed} km/h`;
    document.getElementById('humidity').textContent = `${humidity}%`;
    
    let weatherCode = weatherType === 'rainy' 
        ? weatherCodes.rainy[rainIntensity]
        : weatherCodes[weatherType];
    
    updateWeatherAnimation(weatherCode, windSpeed);
    document.getElementById('condition').textContent = getWeatherCondition(weatherCode);
});

searchBtn.addEventListener('click', updateWeather);
locationInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') updateWeather();
});

// Weather type mappings
const weatherCodes = {
    'clear': 0,
    'cloudy': 2,
    'rainy': {
        'light': 51,
        'moderate': 61,
        'heavy': 65
    }
};
