import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';



export function ScatterChartCustom({data}) {
    return (
      <ResponsiveContainer width="100%">
        <ScatterChart
          margin={{
            top: 20,
            right: 20,
            bottom: 20,
            left: 20,
          }}
        >
          <CartesianGrid />
          <XAxis type="number" dataKey="x" name="Date" unit="" />
          <YAxis type="number" dataKey="y" name="Speed" unit="km/s" />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
          <Scatter name="Speed overview" data={data} fill="#8884d8" />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }
