import { createClient } from "@/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        {
          error: `Missing id`,
        },
        { status: 400 },
      );
    }

    // find correct path to image by searching supabase storage
    const s = await createClient();

    const { data: img, error } = await s.storage.from("images").list(body.id, {
      limit: 1,
      offset: 0,
      sortBy: { column: "name", order: "asc" },
    });
    console.log(img);

    if (error) {
      return NextResponse.json(
        {
          error: `Supabase error: ${error.message}`,
        },
        { status: 500 },
      );
    }

    const flaskResponse = await fetch(
      "https://eft-lasting-hermit.ngrok-free.app/classify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_id: body.id + "/" + img[0].name,
        }),
      },
    );

    const data = await flaskResponse.json();

    if (!flaskResponse.ok) {
      return NextResponse.json(
        {
          error: `Flask server responded with status: ${data.error}`,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error forwarding to Flask:", error);
    return NextResponse.json(
      { error: "Failed to connect to classification service" },
      { status: 500 },
    );
  }
}
