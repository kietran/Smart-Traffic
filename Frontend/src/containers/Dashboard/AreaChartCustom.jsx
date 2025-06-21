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

const renderCustomAxisTick = ({ x, y, payload }) => {
  const [date, time] = payload.value.split(" ");
  const [day, month, year] = date.split("-");
  const [hour, minute] = time.split(":");

  const line1 = `${hour}:${minute}`; // dòng 1: giờ
  const line2 = `${day}-${month}-${year}`; // dòng 2: ngày-tháng

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={10} textAnchor="middle" fill="#666" fontSize={12}>
        <tspan x={0} dy="1.2em">
          {line1}
        </tspan>
        <tspan x={0} dy="1.2em">
          {line2}
        </tspan>
      </text>
    </g>
  );
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
        <Tooltip />
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
