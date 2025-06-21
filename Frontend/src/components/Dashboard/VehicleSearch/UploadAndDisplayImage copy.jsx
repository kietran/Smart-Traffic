import React, { useState, useRef } from "react";
import { Box, Button, IconButton, Paper, Typography } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

const UploadAndDisplayImage = () => {
    const [image, setImage] = useState(null);
    const fileInputRef = useRef(null);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Tạo URL object để preview ảnh
            const imageUrl = URL.createObjectURL(file);
            setImage({ file, imageUrl });
        }
    };

    const handleDeleteImage = () => {
        if (image?.imageUrl) {
            URL.revokeObjectURL(image.imageUrl);
        }
        setImage(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current.click();
    };

    return (
        <Paper
            elevation={3}
            sx={{
                p: 3,
                maxWidth: 400,
                mx: "auto",
                textAlign: "center",
                borderRadius: 2,
            }}
        >
            <Typography variant="h6" sx={{ mb: 2 }}>
                Upload ảnh của bạn
            </Typography>

            {!image ? (
                <Box>
                    <Button variant="contained" onClick={handleUploadClick}>
                        Chọn ảnh
                    </Button>
                    <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleImageChange}
                        style={{ display: "none" }}
                    />
                </Box>
            ) : (
                <Box>
                    <Box
                        component="img"
                        src={image.imageUrl}
                        alt="Preview"
                        sx={{
                            width: "100%",
                            height: "auto",
                            borderRadius: 1,
                            mb: 1,
                            boxShadow: 3,
                        }}
                    />
                    <IconButton color="error" onClick={handleDeleteImage}>
                        <DeleteIcon />
                    </IconButton>
                </Box>
            )}
        </Paper>
    );
};

export default UploadAndDisplayImage;
