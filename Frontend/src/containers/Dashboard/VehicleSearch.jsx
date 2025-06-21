import { useEffect, useState, useRef } from "react";
import ModeEditOutlineIcon from "@mui/icons-material/ModeEditOutline";
import TouchAppIcon from "@mui/icons-material/TouchApp";
import VideoCameraFrontIcon from "@mui/icons-material/VideoCameraFront";
import PhotoIcon from "@mui/icons-material/Photo";
import DownloadForOfflineIcon from "@mui/icons-material/DownloadForOffline";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { apiVehicleSearch, apiLPR, apiSearchLpr } from "../../connectDB/axios";
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Button,
  TextField,
  Pagination,
} from "@mui/material";
import FrameList from "../../components/Dashboard/VehicleSearch/FrameList";
import UploadAndDisplayImage from "../../components/Dashboard/VehicleSearch/UploadAndDisplayImage";
import OptionsDrop from "../../components/Dashboard/VehicleSearch/OptionsDrop";
import Checkbox from "@mui/material/Checkbox";
import Select from "@mui/material/Select";
import { DatePicker, Space } from "antd";
import {SingleSelectCustom} from "../../components/SelectCustom";
const { RangePicker } = DatePicker;

const label = { inputProps: { "aria-label": "Checkbox demo" } };
const intervalOptions = [
    { value: "car", label: "car" },
    { value: "motorbike", label: "motorbike" },
    { value: "truck", label: "truck" },
  ];
function VehicleSearch() {
  const [count, setCount] = useState(0);
  const [value, setValue] = useState(0);

  const [selectedImage, setSelectedImage] = useState(null);
  const [filter, setFilter] = useState("");
  const [image, setImage] = useState(null);

  const [metadata, setMetadata] = useState({});
  const [searchPreview, setSearchPreview] = useState([]);
  const [plateImage, setPlateImage] = useState(null);
  const [timeStrings, setTimeStrings] = useState([]);
  
  const onChangeTime = (dates, dateStrings) => {
    console.log("Selected Time: ", dates);
    console.log("Formatted Selected Time: ", dateStrings);
        if (dateStrings.length === 2) {
            setTimeStrings(dateStrings);
        }
    };
    
    const singleSelectChange = (value) => {
        setMetadata({
            ...metadata,
            label: value,
        });
    }

  useEffect(() => {
    const formData = new FormData();
    if (!image || !image.file) {
        setMetadata({
            license_number: "",
            color: "",
            logo: "",
            is_lpr: false,
            is_color: false,
            is_logo: false,
            label:"",
            threshold: 0.2,

        });
      setPlateImage(null);
      setImage(null);
      setSearchPreview([]);
      return;
    }
    formData.append("file", image.file);
    console.log(formData);
    apiLPR(formData).then((res) => {
      let plateURI = res.plate_img;
      plateURI = `data:image/png;base64,${plateURI}`;
      setPlateImage(plateURI);
      delete res.plate_img;
      setMetadata({...res, 
        is_lpr: true,
        is_color: true,
        is_logo: true,
        lpr_placeholder: res.license_number,
        color_placeholder: res.color,
        logo_placeholder: res.logo,
        label: "",
        threshold: 0.2,
      });
    });
    setSearchPreview([]);

  }, [image]);
  useEffect(() => {}, []);

  const searchAction = () => {
    const formData = new FormData();
    if (!image) {
      return;
    }
    formData.append("file", image.file);
    console.log("metadata", metadata);
    let params = {
        license_number: metadata.license_number !== "Unknown" ? metadata.license_number : "",
        color: metadata.is_color && metadata.color !== "Unknown" ? metadata.color : "",
        logo: metadata.is_logo && metadata.logo !== "Unknown"  ? metadata.logo : "",
        label:metadata.label ? metadata.label : "car",
        threshold: metadata.threshold ? metadata.threshold : 0.2,
    }
    apiVehicleSearch({formData, params}).then((res) => {
        if (res.results.length === 0) {
            setSearchPreview([]);
            return;
        }
      setSearchPreview(res.results);
    });
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
            xs={3}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
            }}
          >
            {/* <Typography variant="h6">Tool</Typography> */}

      
            <Button
              variant="outlined"
              sx={{
                fontSize: "12px",
                padding: "8px",
                marginRight: "10px",
                fontWeight: "bold",
              }}
              onClick={searchAction}
            >
              Route analysis
            </Button>
            <Button
              variant="outlined"
              sx={{
                fontSize: "12px",
                padding: "8px",
                marginRight: "10px",
                fontWeight: "bold",
              }}
              onClick={searchLpr}
            >
              Search LPR
            </Button>
          </Grid>
          <Grid item xs={9}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div className="space-x-3 flex align-center">
                {/* <TextField
                  label="Filter Cam"
                  variant="outlined"
                  size="small"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                /> */}
                <RangePicker showTime 
                onChange={onChangeTime} 
                />
                {/* <Button
                  variant="outlined"
                  sx={{
                    fontSize: "12px",
                    padding: "8px",
                    fontWeight: "bold",
                  }}
                >
                  Apply Filter
                </Button> */}
              </div>

              {/* <Pagination
                color="primary"
                count={3}
                variant="outlined"
                sx={{
                  float: "right",
                }}
              /> */}
            </Box>
          </Grid>
        </Grid>

        {/* Main Content */}
        <Grid container spacing={2} sx={{ mt: 0, padding: 2 }}>
          {/* Left Section */}
          <Grid
            item
            xs={3}
            sx={{
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Target Thumbnail */}
            <Box>
              <UploadAndDisplayImage image={image} setImage={setImage} />
            </Box>

            <div
              style={{
                width: "100%",
                height: "125px",
                backgroundImage: `url(${plateImage})`,
                backgroundSize: "contain",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                borderRadius: "4px",
                border: "1px solid #ddd",
                boxShadow: "0px 4px 6px rgba(0,0,0,0.1)",
                marginBottom: "10px",
              }}
            ></div>
            {/* Event Info */}
            <Box
              sx={{
                border: "1px solid #ddd",
                borderRadius: "4px",
                padding: 2,
                flexGrow: 1,
              }}
            >
              <Typography
                variant="body1"
                sx={{ mb: 2, fontSize: 18, fontWeight: "bold" }}
              >
                Vehicle Info Filter
              </Typography>
              <div className="flex flex-row gap-2 items-center justify-start">
                                <SingleSelectCustom
                                    data={intervalOptions}
                                    label="Type Vehicle"
                                    singleSelectChange={singleSelectChange}
                                  />    
                </div>
              <div className="flex flex-row gap-2 items-center justify-start">
                  <TextField
                    id="32444"
          
                    label={metadata.threshold ? "" : "Threshold"}
                    placeholder={metadata.threshold}
                    value={metadata.threshold}
                    onChange={(e) =>
                      setMetadata({
                        ...metadata,
                        threshold: e.target.value,
                      })
                    }

                    sx={{
                      display: "block",
                      marginBottom: "4px",
                    }}
                  />
                  <Checkbox
                    {...label}
                    defaultChecked
                    disabled
                    onChange={(e) =>
                      setMetadata({
                        ...metadata,
                        is_lpr: e.target.checked,
                      })

                    }
                    sx={{
                      display: "block",
                    }}
                  />
                </div>
              <div className="flex flex-col gap-2">
                <div className="flex flex-row gap-2 items-center justify-start">
                  <TextField
                    id="lpr"
                    label={metadata.license_number ? "" : "license plate"}
                    placeholder={metadata.lpr_placeholder}
                    value={metadata.license_number}
                    onChange={(e) =>
                      setMetadata({
                        ...metadata,
                        license_number: e.target.value,
                      })
                    }

                    sx={{
                      display: "block",
                      marginBottom: "4px",
                    }}
                  />
                  <Checkbox
                    {...label}
                    defaultChecked
                    disabled
                    onChange={(e) =>
                      setMetadata({
                        ...metadata,
                        is_lpr: e.target.checked,
                      })

                    }
                    sx={{
                      display: "block",
                    }}
                  />
                </div>
      
                <div className="flex flex-row gap-2 items-center justify-start">
                  <TextField
                    id="cl"
                    label={metadata.color ? "" : "color"}
                    placeholder={metadata.color_placeholder}
                    value={metadata.color}
                    onChange={(e) =>
                      setMetadata({
                        ...metadata,
                        color: e.target.value,
                      })
                    }
                    sx={{
                      display: "block",
                      marginBottom: "4px",
                    }}
                  />
                  <Checkbox
                    {...label}
                    defaultChecked
                    onChange={(e) =>
                      setMetadata({
                        ...metadata,
                        is_color: e.target.checked,
                      })
                    }

                    sx={{
                      display: "block",
                    }}
                  />
                </div>
                <div className="flex flex-row gap-2 items-center justify-start">
                  <TextField
                    id="lo"
                    label={metadata.logo ? "" : "logo"}
                    placeholder={metadata.logo_placeholder}
                    value={metadata.logo}
                    onChange={(e) =>
                      setMetadata({
                        ...metadata,
                        logo: e.target.value,
                      })
                    }

                    sx={{
                      display: "block",
                      marginBottom: "4px",
                    }}
                  />
                  <Checkbox
                    {...label}
                    defaultChecked
                    onChange={(e) =>
                      setMetadata({
                        ...metadata,
                        is_logo: e.target.checked,
                      })
                    }

                    sx={{
                      display: "block",
                    }}
                  />
                </div>
              </div>

              {/* <OptionsDrop>
                                <Typography variant="body1" sx={{ mb: 1 }}>
                                    Event Info
                                </Typography>
                                <Typography variant="body2">
                                    Metadata: When, vehicle model, color, camera
                                    name, area name
                                </Typography>
                            </OptionsDrop> */}
            </Box>
          </Grid>

          {/* Right Section */}
          <Grid item xs={9} sx={{ height: "95%" }}>
            {/* Image Search Area */}
            <Box
              sx={{
                border: "1px solid #ddd",
                borderRadius: "4px",
                mb: 2,
                overflow: "auto",
                height: "100%",
                backgroundColor: "#f5f5f5",
              }}
            >
              <FrameList previewList={searchPreview} timeStrings={timeStrings}/>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </>
  );
}

export default VehicleSearch;
