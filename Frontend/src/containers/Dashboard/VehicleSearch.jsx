import { useEffect, useState, useRef } from "react";
import { apiSearchLpr } from "../../connectDB/axios";
import {
  Box,
  Grid,
  Typography,
  Button,
  TextField,
} from "@mui/material";
import LprFrameList from "../../components/Dashboard/VehicleSearch/LprFrameList";
import { DatePicker } from "antd";
const { RangePicker } = DatePicker;

function VehicleSearch() {
  const [metadata, setMetadata] = useState({ license_number: "" });
  const [searchPreview, setSearchPreview] = useState([]);
  const [timeStrings, setTimeStrings] = useState([]);
  
  const onChangeTime = (dates, dateStrings) => {
        if (dateStrings.length === 2) {
            setTimeStrings(dateStrings);
        }
  };

  const searchLpr = () => {
    let data = {
        "license_number": metadata.license_number,
    }
    apiSearchLpr(data).then((res) => {
      console.log("search lpr", res);
      if (res.length === 0) {
        setSearchPreview([]);
        return;
        }
      setSearchPreview(res);
    });
}

  return (
    <>
      <Box sx={{ height: "100%" }}>
        {/* Header Toolbar */}
        <Grid
          container
          alignItems="center"
          sx={{ marginTop: 2, paddingLeft: 2, paddingRight: 2 }}
        >
          <Grid
            item
            xs={12}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              gap: 2
            }}
          >
            <TextField
              id="lpr"
              label="License Plate Number"
              placeholder="Enter license plate"
              value={metadata.license_number}
              onChange={(e) =>
                setMetadata({
                  ...metadata,
                  license_number: e.target.value,
                })
              }
              sx={{
                width: "250px"
              }}
            />
            
            <RangePicker showTime 
              onChange={onChangeTime} 
            />
            
            <Button
              variant="contained"
              color="primary"
              sx={{
                fontSize: "14px",
                padding: "8px 16px",
                fontWeight: "bold",
              }}
              onClick={searchLpr}
            >
              Search
            </Button>
          </Grid>
        </Grid>

        {/* Main Content */}
        <Grid container sx={{ mt: 2, padding: 2 }}>
          <Grid item xs={12} sx={{ height: "calc(100vh - 150px)" }}>
            {/* Image Search Area */}
            <Box
              sx={{
                border: "1px solid #ddd",
                borderRadius: "4px",
                overflow: "auto",
                height: "100%",
                backgroundColor: "#f5f5f5",
              }}
            >
              <LprFrameList previewList={searchPreview} timeStrings={timeStrings}/>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </>
  );
}

export default VehicleSearch;