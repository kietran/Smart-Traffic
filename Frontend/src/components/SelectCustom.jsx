import * as React from "react";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import Select from "@mui/material/Select";
import OutlinedInput from "@mui/material/OutlinedInput";
import Checkbox from "@mui/material/Checkbox";
import ListItemText from "@mui/material/ListItemText";
export function SingleSelectCustom({ data, label, singleSelectChange=null }) {
  const [selectedValue, setSelectedValue] = React.useState(300);

  const handleChange = (event) => {
    setSelectedValue(event.target.value);
    singleSelectChange && singleSelectChange(event.target.value);
  };
  return (
    <FormControl sx={{ m: 1, minWidth: 120 }}>
      <InputLabel id="custom-select-label">{label}</InputLabel>
      <Select
        labelId="custom-select-label"
        id="custom-select"
        value={selectedValue}
        onChange={handleChange}
        label={label}
      >
        <MenuItem value="">
          <em>None</em>
        </MenuItem>


        {data?.map((item, index) => (
          <MenuItem key={index} value={item.value}>
            {item.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

export function MultipleSelectCustom({ data, label, multiSelectChange }) {
  const [itemValue, setItemValue] = React.useState(["ALL"]);

  const handleChange = (event) => {
    let {
      target: { value },
    } = event;
    console.log("value", value);
    if (!value.includes("ALL") && value.length > 1) {
      //   remove "ALL"
      value = value.filter((item) => item !== "ALL");
    } else if (value.includes("ALL") && value.length > 1) {
      value = ["ALL"];
    }
    multiSelectChange && multiSelectChange(value);
    setItemValue(
      // On autofill we get a stringified value.
      typeof value === "string" ? value.split(",") : value
    );
  };
  return (
    <div>
      <FormControl sx={{ m: 1, width: 300 }}>
        <InputLabel id="demo-multiple-checkbox-label">{label}</InputLabel>
        <Select
          labelId="demo-multiple-checkbox-label"
          id="demo-multiple-checkbox"
          multiple
          value={itemValue}
          onChange={handleChange}
          input={<OutlinedInput label={label} />}
          renderValue={(selected) => selected.join(", ")}
          MenuProps={MenuProps}
        >
          <MenuItem key={"ALL"} value={"ALL"}>
            <Checkbox checked={itemValue.includes("ALL")} />
            <ListItemText primary={"ALL"} />
          </MenuItem>
          {data.map((item) => (
            <MenuItem key={item.value} value={item.value}>
              <Checkbox
                checked={
                  itemValue.includes(item.label) || itemValue.includes("ALL")
                }
              />
              <ListItemText primary={item.label} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  );
}
