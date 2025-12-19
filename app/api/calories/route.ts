import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const food = searchParams.get('food')

  if (!food) {
    return NextResponse.json({ error: 'Food is required' }, { status: 400 })
  }

  const apiKey = process.env.USDA_API_KEY

  if (!apiKey) {
    return NextResponse.json({ error: 'API key missing!!' }, { status: 500 })
  }

  try {
    const response = await fetch(
      `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(
        food
      )}&pageSize=1&api_key=${apiKey}`
    )

    const data = await response.json()

    const nutrients = data.foods?.[0]?.foodNutrients ?? []
    const calories =
      nutrients.find((n: any) => n.nutrientName === 'Energy')?.value ?? null

    return NextResponse.json({ calories })
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch calories' },
      { status: 500 }
    )
  }
}
