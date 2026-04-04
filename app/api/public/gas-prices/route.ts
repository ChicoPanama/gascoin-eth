import { NextResponse } from 'next/server';
export async function GET(){
  return NextResponse.json([
    { city:'New York', country:'US', pricePerLiter:'$1.08', pricePerGallonUsd:'$4.09' },
    { city:'Los Angeles', country:'US', pricePerLiter:'$1.27', pricePerGallonUsd:'$4.81' },
    { city:'London', country:'UK', pricePerLiter:'£1.49', pricePerGallonUsd:'$7.24' },
    { city:'Tokyo', country:'JP', pricePerLiter:'¥176', pricePerGallonUsd:'$4.52' },
    { city:'Sao Paulo', country:'BR', pricePerLiter:'R$5.85', pricePerGallonUsd:'$4.43' }
  ]);
}
