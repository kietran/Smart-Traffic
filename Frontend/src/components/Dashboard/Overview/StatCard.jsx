import React from "react";
import { Card, CardContent, Typography, Grid, Avatar } from "@mui/material";
const StatCard = ({ icon, value, label, bgColor }) => (
  <Card
    sx={{
      display: "flex",
      alignItems: "center",
      padding: 2,
      paddingTop: 4,
      paddingBottom: 4,
      borderRadius: 3,
      boxShadow: 3,
    }}
  >
    <Avatar sx={{ bgcolor: bgColor, width: 56, height: 56, marginRight: 2 }}>
      {icon}
    </Avatar>
    <CardContent className="p-0 text-left">
      <Typography variant="h6" fontWeight="bold">
        {value}
      </Typography>
      <Typography variant="subtitle2" color="textSecondary">
        {label}
      </Typography>
    </CardContent>
  </Card>
);

export default StatCard;
