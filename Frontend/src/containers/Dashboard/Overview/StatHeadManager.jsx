import { useEffect, useState } from "react";
import { Grid, Box, Typography } from "@mui/material";

import StatCard from "../../../components/Dashboard/Overview/StatCard";
import VideocamIcon from "@mui/icons-material/Videocam";
import NewReleasesIcon from "@mui/icons-material/NewReleases";
import PreviewIcon from "@mui/icons-material/Preview";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
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
    icon: <NewReleasesIcon />,
    value: "0",
    label: "Total Alerts",
    id: "total_alerts",
    bgColor: "#FF9900",
  },
  {
    icon: <PreviewIcon />,
    value: "0",
    label: "Total Reviewd",
    id: "total_reviewed",
    bgColor: "#33CC66",
  },
  {
    icon: <AssignmentTurnedInIcon />,
    value: "0",
    label: "Total Resolved",
    id: "total_resolved",
    bgColor: "#FF99FF",
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
        return { ...stat, value: totalStats.total_cameras };
      } else if (stat.id === "total_alerts") {
        return { ...stat, value: totalStats.total_alerts };
      } else if (stat.id === "total_reviewed") {
        return { ...stat, value: totalStats.total_reviewed };
      } else if (stat.id === "total_resolved") {
        return { ...stat, value: totalStats.total_resolved };
      }
      return stat;
    });
    setStatistics(updatedStatistics);
  }, [totalStats]);

  return (
    <>
      <Grid container spacing={3} justifyContent="center">
        {statistics.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <StatCard {...stat} />
          </Grid>
        ))}
      </Grid>
    </>
  );
}

export default StatHeadManager;
