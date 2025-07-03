import { useEffect, useState } from "react";
import { Grid, Box, Typography } from "@mui/material";

import StatCard from "../../../components/Dashboard/Overview/StatCard";
import VideocamIcon from "@mui/icons-material/Videocam";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import SignpostIcon from "@mui/icons-material/Signpost";
import { apiGetCamera } from "../../../connectDB/axios";

const statistics_org = [
  {
    icon: <VideocamIcon />,
    value: "0",
    label: "Total Cameras",
    id: "total_cameras",
    bgColor: "#0099FF",
  },
  {
    icon: <VpnKeyIcon />,
    value: "0",
    label: "License Plates",
    id: "total_alerts",
    bgColor: "#1976d2",
  },
  {
    icon: <SignpostIcon />,
    value: "0",
    label: "Wrong Direction",
    id: "total_wrong_direction",
    bgColor: "#FF9900",
  },
];

function StatHeadManager({totalStats}) {
  const [count, setCount] = useState(0);
  const [value, setValue] = useState(0);
  const [statistics, setStatistics] = useState(statistics_org);
  const [cameraInfo, setCameraInfo] = useState(0);

  useEffect(() => {}, []);
  useEffect(() => {
    const updatedStatistics = statistics.map((stat) => {
      if (stat.id === "total_cameras") {
        return { ...stat, value: totalStats.total_cameras || 0 };
      } else if (stat.id === "total_alerts") {
        return { ...stat, value: totalStats.total_alerts || 0 };
      } else if (stat.id === "total_wrong_direction") {
        return { ...stat, value: totalStats.total_wrong_direction || 0 };
      }
      return stat;
    });
    setStatistics(updatedStatistics);
  }, [totalStats]);

  return (
    <>
      <Grid container spacing={3} justifyContent="center">
        {statistics.map((stat, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <StatCard {...stat} />
          </Grid>
        ))}
      </Grid>
    </>
  );
}

export default StatHeadManager;
