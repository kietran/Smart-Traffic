import React, { useMemo, useRef, useState, useEffect } from "react";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";

export default function SearchOptionBar({
  data,
  callBack = null,
  label = "Options",
  vary = null,
  width = 300,
}) {
  const [selectedValue, setSelectedValue] = useState(null);
  const options = data;
  useEffect(() => {
    setSelectedValue(null);
  }, [vary]);

  return (
    <Autocomplete
      options={options.sort((a, b) =>
        a.group && b.group ? a.group.localeCompare(b.group) : -1
      )}
      value={selectedValue}
      groupBy={(option) => (option.group ? option.group : label)}
      getOptionLabel={(option) => option.item_name}
      onChange={(event, value) => {
        setSelectedValue(value);
        if (callBack) {
          callBack(value);
        }
      }}
      sx={{ width: width }}
      renderInput={(params) => <TextField {...params} label={label} />}
    />
  );
}
