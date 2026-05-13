import os
import sys
import pandas as pd
import numpy as np
from datetime import datetime
import streamlit as st  # Streamlit 추가

try:
    import pvlib
    from pvlib.pvsystem import PVSystem, Array, FixedMount
    from pvlib.modelchain import ModelChain
    from pvlib.location import Location
    PVLIB_AVAILABLE = True
except ImportError:
    PVLIB_AVAILABLE = False

# --- 시뮬레이션 로직 (기존 함수 유지) ---
def run_simulation(latitude, longitude, tilt, azimuth, capacity_w, date_str, timezone="UTC"):
    if not PVLIB_AVAILABLE:
        st.error("pvlib 라이브러리가 설치되지 않았습니다.")
        return None

    location = Location(latitude=latitude, longitude=longitude, tz=timezone)
    start = pd.Timestamp(date_str, tz=timezone)
    end = start + pd.Timedelta(days=1) - pd.Timedelta(minutes=5)
    times = pd.date_range(start=start, end=end, freq="5min")

    module_parameters = {"pdc0": capacity_w, "gamma_pdc": -0.003}
    temp_model_params = pvlib.temperature.TEMPERATURE_MODEL_PARAMETERS["sapm"]["open_rack_glass_glass"]

    mount = FixedMount(surface_tilt=tilt, surface_azimuth=azimuth)
    array = Array(mount=mount, module_parameters=module_parameters, temperature_model_parameters=temp_model_params)
    system = PVSystem(arrays=[array], inverter_parameters={"pdc0": capacity_w})
    mc = ModelChain(system, location, spectral_model="no_loss", aoi_model="physical")

    clearsky = location.get_clearsky(times)
    mc.run_model(clearsky)

    ac_values = mc.results.ac.clip(lower=0)

    return {
        "times": ac_values.index,
        "powers": ac_values.values,
        "total_energy": ac_values.sum() / 12,
        "peak_power": ac_values.max()
    }

# --- Streamlit UI 부분 (여기서부터가 진짜 화면을 만듭니다) ---
st.set_page_config(page_title="태양광 발전 시뮬레이터", layout="wide")

st.title("☀️ 태양광 발전 시뮬레이터")
st.write("위도, 경도 및 패널 각도에 따른 예상 발전량을 확인하세요.")

# 사이드바 입력창
st.sidebar.header("📍 위치 및 설비 설정")
lat = st.sidebar.number_input("위도 (Latitude)", value=37.5, step=0.1)
lon = st.sidebar.number_input("경도 (Longitude)", value=127.0, step=0.1)
cap = st.sidebar.number_input("설치 용량 (W)", value=3000, step=100)

st.sidebar.header("📐 패널 설치 설정")
tilt = st.sidebar.slider("설치 각도 (Tilt)", 0, 90, 30)
azimuth = st.sidebar.slider("방위각 (Azimuth, 180은 정남향)", 0, 360, 180)
date = st.sidebar.date_input("시뮬레이션 날짜", datetime.now())

# 시뮬레이션 실행 버튼
if st.sidebar.button("시뮬레이션 실행"):
    with st.spinner("발전량 계산 중..."):
        result = run_simulation(lat, lon, tilt, azimuth, cap, str(date))

        if result:
            # 상단 요약 카드
            col1, col2 = st.columns(2)
            col1.metric("예상 일일 총 발전량", f"{result['total_energy']/1000:.2f} kWh")
            col2.metric("최대 출력", f"{result['peak_power']:.2f} W")

            # 그래프 그리기
            st.subheader(f"📅 {date} 시간대별 예상 발전 그래프")
            chart_data = pd.DataFrame({
                "시간": result['times'],
                "출력(W)": result['powers']
            }).set_index("시간")
            st.line_chart(chart_data)

            st.info("이 결과는 맑은 하늘(Clear Sky) 모델을 기준으로 한 이론적 수치입니다.")
else:
    st.info("왼쪽 설정값을 확인한 후 '시뮬레이션 실행' 버튼을 눌러주세요.")