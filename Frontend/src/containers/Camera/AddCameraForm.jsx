import React, { useMemo, useRef, useState, useEffect } from "react";
import {
  Container,
  Grid,
  TextField,
  Button,
  MenuItem,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  InputLabel,
  Box,
  Typography,
  Divider,
} from "@mui/material";
import ArrowBackIosIcon from "@mui/icons-material/ArrowBackIos";
import {
  apiAddCamera,
  apiGetCameraId,
  apiUpdateCamera,
} from "../../connectDB/axios";
import { useParams } from "react-router";
import Link from "@mui/material/Link";
import Select from "@mui/material/Select";
import Chip from "@mui/material/Chip";
import { useTheme } from "@mui/material/styles";
import OutlinedInput from "@mui/material/OutlinedInput";
const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
import { useNavigate } from "react-router-dom";
import { SnackbarProvider, useSnackbar } from "notistack";
import { useNotifications } from "@toolpad/core/useNotifications";

const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const names = [
  "Crowd Detection",
  "Vehicle Counting",
  "ReIdentify",
  "Speed Estimate",
];
const map_ai_names = {
  "Crowd Detection": "crowd_detection",
  "Vehicle Counting": "vehicle_counting",
  ReIdentify: "reidentify",
  "Speed Estimate": "speed_estimate",
};
function getStyles(name, AISelected, theme) {
  return {
    fontWeight: AISelected.includes(name)
      ? theme.typography.fontWeightMedium
      : theme.typography.fontWeightRegular,
  };
}

const area_data = [
  { id: "LH-LTT-HV", name: "THGT điểm giao đường Lý Thái Tổ - Hùng Vương" },
  { id: "LH-LTT-DK", name: "THGT điểm giao đường Lý Thái Tổ - Đồng Khởi" },
  { id: "LH-HV-LL", name: "Nút giao Hùng Vương – Lê Lợi" },
  { id: "LH-NVL-VNG", name: "Nút giao Nguyễn Văn Linh – Võ Nguyên Giáp" },
  { id: "LH-NVL-HVL", name: "Ngã tư Nguyễn Văn Linh – Huỳnh Văn Lũy" },
];

const AddCameraForm = ({ mode }) => {
  const [camera_id, setCameraId] = useState("");
  const [camera_name, setCameraName] = useState("");
  const [area_id, setAreaId] = useState("");
  const [area_name, setAreaName] = useState("");
  const [desc, setDesc] = useState("");
  const [url, setUrl] = useState("");
  const [data, setData] = useState({});
  const [status, setStatus] = useState(true);
  const theme = useTheme();
  const [AISelected, setAISelected] = React.useState(names);
  const { enqueueSnackbar } = useSnackbar();
  const notifications = useNotifications();
  const handleChange = (event) => {
    const {
      target: { value },
    } = event;
    setAISelected(
      // On autofill we get a stringified value.
      typeof value === "string" ? value.split(",") : value
    );
  };
  const checkValueValid = (data) => {
    // switch case to check all value is not empty
    for (let key in data) {
      switch (key) {
        case "camera_id":
          if (data[key] === "") return key;
          break;
        case "camera_name":
          if (data[key] === "") return key;
          break;
        case "area_id":
          if (data[key] === "") return key;
          break;
        case "url":
          if (data[key] === "") return key;
          break;
        default:
          break;
      }
    }
    return null;
  };

  const navigate = useNavigate();
  const handleAddCam = () => {
    const area = area_data.find((area) => area.id === area_id);
    if (!area) {
      enqueueSnackbar(`Area is required`, { variant: "error" });
    }
    const area_name = area.name;
    const invalidKey = checkValueValid({
      camera_id,
      camera_name,
      area_id,
      area_name,
      url,
      status,
    });
    if (invalidKey !== null) {
      enqueueSnackbar(`${invalidKey} is required`, { variant: "error" });
      return;
    }
    data.desc = desc;

    data.services = names.map((name) => {
      let active = false;
      if (AISelected.includes(name)) {
        active = true;
      }
      return {
        service_name: map_ai_names[name],
        active: active,
        has_clip: false,
        data: {
          cross_line: {},
          polygon_zone: {},
        },
      };
    });

    if (mode === "add") {
      apiAddCamera({
        camera_id,
        camera_name,
        area_id,
        area_name,
        url,
        data,
        status,
      })
        .then((res) => {
          enqueueSnackbar("Add camera successfully", { variant: "success" });
          navigate(`/cameras`);
        })
        .catch((err) => {
          enqueueSnackbar("Add camera failed!", { variant: "error" });
          console.error(err);
        });
    } else if (mode === "edit") {
      console.log("edit", camera_id);
      apiUpdateCamera({
        camera_id,
        camera_name,
        area_id,
        area_name,
        url,
        data,
        status,
      })
        .then((res) => {
          console.log(res);
          enqueueSnackbar("Update camera successfully!", {
            variant: "success",
          });
          navigate(`/cameras`);
        })
        .catch((err) => {
          console.error(err);
          enqueueSnackbar("Update camera failed!", { variant: "error" });
        });
    }
  };
  console.log("status", status);
  const { id } = useParams();
  const getCamInfo = async () => {
    // fetch data from api
    await apiGetCameraId({ id })
      .then((res) => {
        console.log(res);
        let data = res.data;
        console.log("#data", data);
        setCameraId(data.camera_id);
        setCameraName(data.camera_name);
        setAreaId(data.area_id);
        setDesc(data.desc);
        setUrl(data.url);
        setStatus(data.status);
        let AISelected = [];
        Object.keys(map_ai_names).forEach((key) => {
          if (
            data.services.find(
              (service) =>
                service.service_name === map_ai_names[key] &&
                service.active === true
            )
          ) {
            AISelected.push(key);
          }
        });
        setAISelected(AISelected);
        return res.data;
      })
      .catch((err) => {
        console.error(err);
        return;
      });
  };
  useEffect(() => {
    if (id && mode == "edit") {
      // fetch data from api
      getCamInfo();
    }
  }, [id]);
  return (
    <Box sx={{ padding: 2, ml: 5, mr: 5 }}>
      <Box
        sx={{
          p: 3,
          border: "1px solid #ccc",
          borderRadius: "8px",
          boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Box
          sx={{
            p: 3,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            mb: 3,
            gap: 2,
          }}
        >
          <Link href="/cameras" underline="none">
            <ArrowBackIosIcon />
          </Link>
          <Typography variant="h5" sx={{}}>
            {mode == "add" ? "Add" : "Edit"} Camera
          </Typography>
        </Box>

        <Divider sx={{ mb: 3 }} />
        <Grid container spacing={3}>
          {/* Info Section */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              Infomation
            </Typography>
            <TextField
              fullWidth
              label="Camera ID"
              variant="outlined"
              disabled={mode === "edit" ? true : false}
              sx={{ mb: 2 }}
              value={camera_id}
              onChange={(e) => setCameraId(e.target.value)}
            />
            <TextField
              fullWidth
              label="Camera Name"
              variant="outlined"
              sx={{ mb: 2 }}
              value={camera_name}
              onChange={(e) => setCameraName(e.target.value)}
            />
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Area</InputLabel>
              <Select
                label="Area"
                value={area_id}
                onChange={(e) => setAreaId(e.target.value)}
              >
                {area_data.map((area) => (
                  <MenuItem value={area.id}>{area.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Description"
              variant="outlined"
              multiline
              rows={4}
              sx={{ mb: 2 }}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
            <FormControl component="fieldset">
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Active
              </Typography>
              <RadioGroup row value={status ? "active" : "inactive"}>
                <FormControlLabel
                  value="active"
                  control={<Radio />}
                  label="Active"
                  onChange={() => setStatus(true)}
                />
                <FormControlLabel
                  value="inactive"
                  control={<Radio />}
                  label="Inactive"
                  onChange={() => setStatus(false)}
                />
              </RadioGroup>
            </FormControl>
          </Grid>

          {/* Config Section */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              Config
            </Typography>
            <TextField
              fullWidth
              label="IP / Domain Name"
              variant="outlined"
              sx={{ mb: 2 }}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />

            <FormControl fullWidth sx={{ mb: 2 }}>
              {/* <InputLabel id="demo-multiple-chip-label">AI Engines</InputLabel> */}
              {/* <Select
                labelId="demo-multiple-chip-label"
                id="demo-multiple-chip"
                multiple
                value={AISelected}
                onChange={handleChange}
                input={
                  <OutlinedInput id="select-multiple-chip" label="AI Engines" />
                }
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} />
                    ))}
                  </Box>
                )}
                MenuProps={MenuProps}
              >
                {names.map((name) => (
                  <MenuItem
                    key={name}
                    value={name}
                    style={getStyles(name, AISelected, theme)}
                  >
                    {name}
                  </MenuItem>
                ))}
              </Select> */}
            </FormControl>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, textAlign: "right" }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => handleAddCam()}
          >
            Save
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default AddCameraForm;
