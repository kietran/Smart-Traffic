import * as React from "react";
import { styled } from "@mui/material/styles";
import Button from "@mui/material/Button";
import Tooltip, { tooltipClasses } from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
const HtmlTooltip = styled(({ className, ...props }) => (
  <Tooltip
    placement="left-end"
    {...props}
    arrow
    classes={{ popper: className }}
  />
))(({ theme }) => ({
  [`& .${tooltipClasses.arrow}`]: {
    color: "#f5f5f9",
  },
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: "#f5f5f9",
    color: "rgba(0, 0, 0, 0.87)",
    fontSize: theme.typography.pxToRem(12),
    border: "1px solid #dadde9",
    maxWidth: 1000,
  },
}));
export default function InfoTooltip({ vehicleInfo, children }) {
console.log(vehicleInfo)
    // split vehicleInfo.start_time into date and time
    let start_date = vehicleInfo.start_time.split(", ")
    

  return (
    <div>
      <HtmlTooltip
        title={
          <div>
            {Object.keys(vehicleInfo).length > 0 && (
              <React.Fragment>
                <div
                  style={{
                    width: "700px",
                    height: "400px",
                    backgroundImage: `url(${vehicleInfo.target_image})`,
                    backgroundSize: "contain",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                  }}
                ></div>

                <Box
                  sx={{
                    p: 1,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 0.5,
                  }}
                >
                  <Box>
                    <Typography variant="body2">
                      <strong>Date:</strong> {start_date[0]}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Time:</strong> {start_date[1]}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2">
                      <strong>Camera ID:</strong> {vehicleInfo.camera_id}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Plate:</strong> {vehicleInfo.lpr}
                    </Typography>
                  </Box>
                </Box>
              </React.Fragment>
            )}
          </div>
        }
      >
        {children}
      </HtmlTooltip>
    </div>
  );
}
