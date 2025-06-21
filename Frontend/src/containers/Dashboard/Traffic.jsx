import { useEffect, useState } from "react";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Typography } from "@mui/material";
const chartData = [
  { name: "Item 1", speed: 40, volume: 2400 },
  { name: "Item 2", speed: 30, volume: 2210 },
  { name: "Item 3", speed: 50, volume: 2290 },
  { name: "Item 4", speed: 70, volume: 2000 },
  { name: "Item 5", speed: 60, volume: 2181 },
];
function Traffic() {
  const [count, setCount] = useState(0);
  const [value, setValue] = useState(0);

  useEffect(() => {}, []);

  return (
    <>
      <Typography variant="h6">Phân tích lưu lượng xe</Typography>
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Area
            type="monotone"
            dataKey="speed"
            stroke="#8884d8"
            fill="#8884d8"
          />
          <Area
            type="monotone"
            dataKey="volume"
            stroke="#82ca9d"
            fill="#82ca9d"
          />
        </AreaChart>
      </ResponsiveContainer>
    </>
  );
}

export default Traffic;
