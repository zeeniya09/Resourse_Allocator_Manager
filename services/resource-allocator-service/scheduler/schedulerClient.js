import axios from "axios";

export const selectNode = async (data) => {
    const res = await axios.post(
        "http://scheduler-service:4000/schedule",
        data
    );

    return res.data;
};