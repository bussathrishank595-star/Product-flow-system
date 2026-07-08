import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { User } from '@/lib/models';

export async function GET() {
  try {
    await connectDB();
    const count = await User.countDocuments({});
    const users = await User.find({}, 'email setupComplete');
    return NextResponse.json({
      status: 'Connected successfully',
      uri_configured: !!process.env.MONGODB_URI,
      masked_uri: process.env.MONGODB_URI ? process.env.MONGODB_URI.replace(/:([^:@]+)@/, ':***@') : null,
      user_count: count,
      users: users
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'Connection failed',
      error: error.message || String(error)
    }, { status: 500 });
  }
}
