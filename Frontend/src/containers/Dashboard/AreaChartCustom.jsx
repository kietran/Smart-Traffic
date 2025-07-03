import React, { PureComponent } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const field = ["car", "motorbike", "bus", "truck", "bicycle"];
const stroke = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#ff0000"];
const fill = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#ff0000"];

// Helper function to adjust time to UTC+7
const adjustToUTCPlus7 = (dateTimeStr) => {
  const [date, time] = dateTimeStr.split(" ");
  const [day, month, year] = date.split("-");
  const [hour, minute] = time.split(":");

  // Create a date in the local timezone
  const localDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
  
  // Adjust for UTC+7
  const utcPlus7Date = new Date(localDate.getTime() + (7 * 60 * 60 * 1000));
  
  // Format the adjusted time
  const adjustedHour = utcPlus7Date.getHours().toString().padStart(2, '0');
  const adjustedMinute = utcPlus7Date.getMinutes().toString().padStart(2, '0');
  
  return {
    time: `${adjustedHour}:${adjustedMinute}`,
    date: `${day}-${month}-${year}`
  };
};

const renderCustomAxisTick = ({ x, y, payload }) => {
  const { time, date } = adjustToUTCPlus7(payload.value);

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={10} textAnchor="middle" fill="#666" fontSize={12}>
        <tspan x={0} dy="1.2em">
          {time}
        </tspan>
        <tspan x={0} dy="1.2em">
          {date}
        </tspan>
      </text>
    </g>
  );
};

// Custom tooltip formatter to display time in UTC+7
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const { time, date } = adjustToUTCPlus7(label);
    
    return (
      <div className="custom-tooltip" style={{ 
        backgroundColor: 'white', 
        padding: '10px', 
        border: '1px solid #ccc',
        borderRadius: '4px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <p className="label" style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>{`${date} ${time}`}</p>
        {payload.map((entry, index) => (
          <p key={`item-${index}`} style={{ 
            margin: '2px 0',
            color: entry.color
          }}>
            {`${entry.name}: ${entry.value}`}
          </p>
        ))}
      </div>
    );
  }

  return null;
};

export function AreaChartCustom({ data, title, multiSelectValues, area }) {
  const [opacity, setOpacity] = React.useState({
    car: 0.7,
    motorbike: 0.7,
    bus: 0.7,
    person: 0.7,
  });
  const [activeSeries, setActiveSeries] = React.useState([]);
  const handleLegendClick = (o) => {
    const { dataKey } = o;

    if (activeSeries.includes(dataKey)) {
      setActiveSeries(activeSeries.filter((el) => el !== dataKey));
    } else {
      setActiveSeries((prev) => [...prev, dataKey]);
    }
  };
  const handleMouseEnter = (o) => {
    const { dataKey } = o;

    setOpacity((op) => ({ ...op, [dataKey]: 1 }));
  };

  const handleMouseLeave = (o) => {
    const { dataKey } = o;

    setOpacity((op) => ({ ...op, [dataKey]: 0.7 }));
  };
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        width={500}
        height={500}
        data={
          data &&
          data.filter((item) =>
            area && area.length > 0 ? area.includes(item.name) : true
          )
        }
        margin={{
          top: 10,
          right: 30,
          left: 0,
          bottom: 10,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <defs>
          <linearGradient id="colorcar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ffc658" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#ffc658" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tick={renderCustomAxisTick}
          interval={data?.length > 10 ? 3 : 1}
          tickFormatter={(value, index) => {
            return value;
          }}
        />
        <YAxis />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleLegendClick}
          layout="horizontal"
          verticalAlign="top"
          align="center"
          iconType="circle"
          iconSize={14}
          wrapperStyle={{ paddingBottom: "20px" }}
        />
        {field.map((item, index) => (
          <Area
            key={index}
            type="monotone"
            dataKey={item}
            stackId="1"
            strokeOpacity={opacity[item]}
            fillOpacity={opacity[item]}
            hide={activeSeries.includes(item)}
            stroke={stroke[index]}
            fill={fill[index]}
          />
        ))}
      </AreaChart>
      <p className="text-yellow-950 italic">{title}</p>
    </ResponsiveContainer>
  );
}
