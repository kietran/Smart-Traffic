import * as React from "react";
import { useEffect } from "react";
import ImageList from "@mui/material/ImageList";
import ImageListItem from "@mui/material/ImageListItem";
import ImageListItemBar from "@mui/material/ImageListItemBar";
import ListSubheader from "@mui/material/ListSubheader";
import IconButton from "@mui/material/IconButton";
import InfoIcon from "@mui/icons-material/Info";
import PopupManager from "../../../containers/Dashboard/PopupManager";
import { apiGetVideo } from "../../../connectDB/axios";


const area_data = [
    { id: "LH-LTT-HV", name: "THGT điểm giao đường Lý Thái Tổ - Hùng Vương" },
    { id: "LH-LTT-DK", name: "THGT điểm giao đường Lý Thái Tổ - Đồng Khởi" },
    { id: "LH-HV-LL", name: "Nút giao Hùng Vương – Lê Lợi" },
    { id: "LH-NVL-VNG", name: "Nút giao Nguyễn Văn Linh – Võ Nguyên Giáp" },
    { id: "LH-NVL-HVL", name: "Ngã tư Nguyễn Văn Linh – Huỳnh Văn Lũy" },
    {
        id: "LH-VVK-HV",
        name: "Nút giao Võ Văn Kiệt – Hùng Vương",
    },
    { id: "LH-NKKN-LD", name: "Ngã tư Nam Kỳ Khởi Nghĩa - Lê Duẩn" },
    { id: "LH-VNG-LL", name: "Nút giao Võ Nguyên Giáp – Lê Lợi" },
    { id: "LH-VX-HVL", name: "Vòng xoay – Huỳnh Văn Lũy" }
  ];


export default function FrameList({ previewList=[], timeStrings=[], height= "90vh" }) {
  const [frameHoverIndex, setFrameHoverIndex] = React.useState(false);
    const [openDetail, setOpenDetail] = React.useState({ open: false, row: {} });
    const [viewImageList, setViewImageList] = React.useState([]);

  const handleClose = () => {
    setOpenDetail({ open: false });
  };
  useEffect(() => {
    let new_previewList = [...previewList];
    if (previewList.length > 0) {
        if (timeStrings.length == 2) {
            const startTime = new Date(timeStrings[0]);
            const endTime = new Date(timeStrings[1]);
            new_previewList = previewList.filter((item) => {
                const itemTime = new Date(item.snapshot_at);
                console.log("itemTime", itemTime, startTime, endTime, itemTime <= endTime);
                return itemTime >= startTime && itemTime <= endTime;
            });
      
        }
        const groupedByDate = new_previewList.reduce((acc, item) => {
            let dateKey = item.camera_id
           
            dateKey = dateKey.split("_")[0]
            dateKey = area_data.find((area) => area.id === dateKey)?.name || dateKey;
            if (!acc[dateKey]) acc[dateKey] = [];
            acc[dateKey].push(item);
            return acc;
          }, {});
          setViewImageList(groupedByDate);

    } else {
        setViewImageList([]);
    }
  }
    , [previewList, timeStrings]);
  return (
    <>
{Object.entries(viewImageList).map(([date, items]) => (
  <div key={date}
  style={{
    "padding": "10px",
  }}
  >
    <h3 style={{ margin: "0", color: "#333", padding:"4px", textAlign:"left" }}>{date}</h3>
    <ImageList
      sx={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "start",
        marginBottom: "50px",
        borderWidth: "1px",
        borderColor: "#ccc",
        borderStyle: "dashed",
        borderRadius: "4px",
        padding: "10px",

      }}
      cols={5}
    >
      {items.map((item, index) => (
        <ImageListItem
          key={index}
          onMouseOver={() => setFrameHoverIndex(index)}
          onMouseOut={() => setFrameHoverIndex(-1)}
          sx={{
            width: "240px",
            height: "200px !important",
            position: "relative",
          }}
        >
            
          <div
            style={{
              backgroundImage: `url(${item.thumbnail_path && item.thumbnail_path !== "unknown" ? item.thumbnail_path : "./no-available.png"})`,
              width: "240px",
              height: "200px",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              borderRadius: "4px",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            }}
            onClick={() => {
              setOpenDetail({
                open: true,
                row: {
                  full_image: item.thumbnail_path,
                  camera_id: item?.camera_id,
                  snapshot_at: item?.snapshot_at,
                },
              });
            }}
            alt={item.camera_name}
          />

          <ImageListItemBar
            title={item.camera_name}
            subtitle={item.camera_id}
            sx={{
              opacity: frameHoverIndex === index ? 1 : 0.5,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              "& .MuiImageListItemBar-title": { fontSize: "16px" },
              "& .MuiImageListItemBar-subtitle": { fontSize: "12px" },
            }}
            actionIcon={
              <IconButton
                sx={{ color: "rgba(255, 255, 255, 0.54)" }}
                aria-label={`info about ${item.identity}`}
              >
                <InfoIcon />
              </IconButton>
            }
          />
        </ImageListItem>
      ))}
    </ImageList>
  </div>
))}

        <PopupManager
            open={openDetail.open}
            data={openDetail.row}
            handleClose={handleClose}
        />

    </>



  );
}
