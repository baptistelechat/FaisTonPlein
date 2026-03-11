import axios from "axios";
import { CSV_URL } from "../config";

async function inspect() {
  try {
    const response = await axios.get(CSV_URL, {
      responseType: "stream",
    });

    const stream = response.data;
    let data = "";

    stream.on("data", (chunk: Buffer) => {
      data += chunk.toString();
      if (data.includes("\n")) {
        const lines = data.split("\n");
        console.log("Header:", lines[0]);
        console.log("First row:", lines[1]);
        stream.destroy(); // Stop after reading header and first row
      }
    });
  } catch (error) {
    console.error("Error fetching CSV:", error);
  }
}

inspect();
