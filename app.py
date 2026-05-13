    import streamlit as st
    import pandas as pd
    import numpy as np
    from datetime import datetime
    from geopy.geocoders import Nominatim # 주소 검색용
    import plotly.graph_objects as go # 측면 구조 및 그래프 시각화

    # --- 환경 설정 ---
    st.set_page_config(page_title="태양광 경사각 비교 분석", layout="wide")

    # 라이브러리 체크
    try:
        import pvlib
        from pvlib.location import Location
        PVLIB_READY = True
    except ImportError:
        PVLIB_READY = False

    # --- 주소 -> 위경도 변환 함수 ---
    def get_coords(address):
        try:
            geolocator = Nominatim(user_agent="solar_sim_user")
            location = geolocator.geocode(address)
            if location:
                return location.latitude, location.longitude
            return None, None
        except:
            return None, None

    # --- 시뮬레이션 엔진 ---
    def run_solar_sim(lat, lon, tilt, azimuth, capacity, date_str):
        if not PVLIB_READY: return None

        loc = Location(latitude=lat, longitude=lon)
        times = pd.date_range(start=date_str, periods=288, freq="5min", tz="Asia/Seoul")

        # 맑은 하늘 모델 기준 시뮬레이션
        clearsky = loc.get_clearsky(times)
        solar_position = loc.get_solarposition(times)

        # 단순화된 AC 출력 계산 로직
        irradiance = pvlib.irradiance.get_total_irradiance(
            surface_tilt=tilt, surface_azimuth=azimuth,
            solar_zenith=solar_position['zenith'], solar_azimuth=solar_position['azimuth'],
            dni=clearsky['dni'], ghi=clearsky['ghi'], dhi=clearsky['dhi']
        )

        # 효율 85% 가정 및 용량 반영
        ac_power = irradiance['poa_global'] * (capacity / 1000) * 0.85
        ac_power = ac_power.clip(lower=0)

        return {
            "times": times,
            "powers": ac_power.values,
            "total_energy": ac_power.sum() * (5/60), # 5분 단위 적분
            "peak_power": ac_power.max(),
            "peak_time": times[ac_power.argmax()].strftime("%H:%M")
        }

    # --- 측면 구조 시각화 함수 ---
    def draw_side_view(tilt, color):
        # 패널의 끝점을 삼각함수로 계산
        length = 1.0 # 패널 길이 단위
        rad = np.radians(tilt)
        x = [0, np.cos(rad)]
        y = [0, np.sin(rad)]

        fig = go.Figure()
        # 바닥 지면
        fig.add_shape(type="line", x0=-0.2, y0=0, x1=1.2, y1=0, line=dict(color="Gray", width=3))
        # 태양광 패널
        fig.add_trace(go.Scatter(x=x, y=y, mode='lines+text', line=dict(color=color, width=8), 
                                 text=[f"{tilt}°"], textposition="top right"))

        fig.update_layout(showlegend=False, height=200, margin=dict(l=10, r=10, t=30, b=10),
                          xaxis=dict(visible=False, range=[-0.5, 1.5]), 
                          yaxis=dict(visible=False, range=[-0.1, 1.1], scaleanchor="x", scaleratio=1))
        return fig

    # --- 사이드바: 입력 제어 ---
    st.sidebar.header("🔍 위치 및 정보 입력")

    # 주소 입력 기능
    address_input = st.sidebar.text_input("설치 주소 입력", "서울시 강남구")
    if st.sidebar.button("주소 검색"):
        lat_found, lon_found = get_coords(address_input)
        if lat_found:
            st.session_state['lat'] = lat_found
            st.session_state['lon'] = lon_found
            st.sidebar.success(f"좌표 확인: {lat_found:.4f}, {lon_found:.4f}")
        else:
            st.sidebar.error("주소를 찾을 수 없습니다.")

    # 텍스트 직접 입력 (위도/경도)
    lat = st.sidebar.number_input("위도", value=st.session_state.get('lat', 37.5), format="%.5f")
    lon = st.sidebar.number_input("경도", value=st.session_state.get('lon', 126.9), format="%.5f")

    # 시스템 사양 (텍스트 입력)
    cap = st.sidebar.number_input("패널 용량 (W)", value=3000)
    azimuth = st.sidebar.number_input("방위각 (0:북, 180:남)", value=180)
    date = st.sidebar.date_input("분석 날짜", datetime.now())

    # 비교할 경사각 (텍스트로 여러 개 입력)
    st.sidebar.header("📊 경사각 비교 설정")
    tilt_input = st.sidebar.text_input("비교할 경사각들 (쉼표로 구분)", "10, 20, 30")
    tilts = [int(t.strip()) for t in tilt_input.split(",") if t.strip().isdigit()]

    # --- 메인 화면: 결과 표시 ---
    st.title("📐 태양광 경사각 성능 비교 대시보드")

    if tilts:
        results = []
        # 1. 측면 구조 비교 영역
        st.subheader("🖼️ 측면 설치 구조 비교")
        cols = st.columns(len(tilts))
        colors = ["#FFA500", "#1E90FF", "#32CD32", "#FF4500", "#8A2BE2"] # 각도별 색상

        for i, tilt in enumerate(tilts):
            with cols[i]:
                st.markdown(f"**경사각: {tilt}°**")
                res = run_solar_sim(lat, lon, tilt, azimuth, cap, str(date))
                results.append(res)
                st.plotly_chart(draw_side_view(tilt, colors[i % len(colors)]), use_container_width=True)
                st.metric("예상 발전량", f"{res['total_energy']/1000:.2f} kWh")

        # 2. 발전량 곡선 그래프
        st.subheader("📈 시간대별 발전 출력 비교")
        fig_line = go.Figure()
        for i, res in enumerate(results):
            fig_line.add_trace(go.Scatter(x=res['times'], y=res['powers'], name=f"{tilts[i]}° 설치",
                                          line=dict(color=colors[i % len(colors)], width=3)))
        fig_line.update_layout(xaxis_title="시간", yaxis_title="출력 (W)", height=400)
        st.plotly_chart(fig_line, use_container_width=True)

        # 3. 성능 지표 테이블
        st.subheader("📋 상세 성능 지표 비교")
        report_data = []
        for i, res in enumerate(results):
            report_data.append({
                "경사각": f"{tilts[i]}°",
                "총 발전량(kWh)": round(res['total_energy']/1000, 3),
                "피크 출력(W)": round(res['peak_power'], 1),
                "최대 발전 시간": res['peak_time']
            })
        st.table(pd.DataFrame(report_data))

    else:
        st.warning("왼쪽 사이드바에 비교할 경사각을 입력해 주세요 (예: 15, 30, 45).")