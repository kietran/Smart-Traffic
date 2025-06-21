import { useEffect, useState } from "react";
import { Grid, Box, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import Paper from "@mui/material/Paper";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Overview from "./Overview";
import Analysis from "./Analysis";
import VehicleSearch from "./VehicleSearch";
function DashboardManager() {
  const [count, setCount] = useState(0);
  const [value, setValue] = useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };
  useEffect(() => {}, []);

  return (
    <>
      <Box
        sx={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box sx={{ width: "100%", bgcolor: "white" }}>
          <Tabs value={value} onChange={handleChange}>
            <Tab label="Live" />
            <Tab label="Overview" />
            <Tab label="Vehicle Analysis" />
          </Tabs>
        </Box>
        <Box
          sx={{
            padding: 0,
            width: "100%",
            position: "relative",
            flex: 1,
            bgcolor: "white",
          }}
        >
          {value === 1 && <Overview />}
          {value === 0 && <Analysis />}
          {value === 2 && <VehicleSearch />}
        </Box>
      </Box>
    </>
  );
}

export default DashboardManager;
