import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, CandlestickSeries, LineSeries, AreaSeries } from 'lightweight-charts';

export const TradingChart = ({
    data,
    colors: {
        backgroundColor = 'transparent',
        textColor = '#d1d5db',
        upColor = '#22c55e',
        downColor = '#ef4444',
        gridColor = 'rgba(255, 255, 255, 0.1)',
        lineColor = '#3b82f6',
    } = {},
    type = 'candlestick',
    height = 300,
    width = '100%'
}) => {
    const chartContainerRef = useRef();
    const chartRef = useRef(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const handleResize = () => {
            if (chartRef.current && chartContainerRef.current) {
                chartRef.current.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                });
            }
        };

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: backgroundColor },
                textColor,
            },
            grid: {
                vertLines: { color: gridColor },
                horzLines: { color: gridColor },
            },
            width: chartContainerRef.current.clientWidth,
            height,
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
            },
            rightPriceScale: {
                borderVisible: false,
            },
        });

        chartRef.current = chart;

        let series;
        if (type === 'candlestick') {
            series = chart.addSeries(CandlestickSeries, { upColor, downColor, borderVisible: false, wickUpColor: upColor, wickDownColor: downColor });
        } else if (type === 'line') {
            series = chart.addSeries(LineSeries, { color: lineColor, lineWidth: 2 });
        } else {
            series = chart.addSeries(AreaSeries, { 
                lineColor, 
                topColor: `${lineColor}88`, 
                bottomColor: 'rgba(59, 130, 246, 0.04)' 
            });
        }

        if (data && data.length > 0) {
            series.setData(data);
            chart.timeScale().fitContent();
        }

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [data, backgroundColor, textColor, upColor, downColor, gridColor, lineColor, type, height]);

    return (
        <div 
            ref={chartContainerRef} 
            className="w-full rounded-xl overflow-hidden" 
            style={{ minHeight: height, width }} 
        />
    );
};
