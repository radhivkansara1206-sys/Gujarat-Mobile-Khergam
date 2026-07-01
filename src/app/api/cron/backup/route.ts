import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const maxDuration = 300; // Allow maximum execution time for serverless

export async function GET(request: Request) {
  try {
    // 1. Verify Vercel Cron Secret (Security)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch required environment variables
    const githubToken = process.env.GITHUB_BACKUP_TOKEN;
    const githubOwner = process.env.GITHUB_BACKUP_OWNER;
    const githubRepo = process.env.GITHUB_BACKUP_REPO;

    if (!githubToken || !githubOwner || !githubRepo) {
      console.error('Missing GitHub configuration variables.');
      return NextResponse.json({ error: 'Missing GitHub config' }, { status: 500 });
    }

    // 3. Extract all data from Prisma
    console.log('Extracting data from database...');
    const data = {
      users: await prisma.user.findMany(),
      categories: await prisma.category.findMany(),
      items: await prisma.item.findMany(),
      sales: await prisma.sale.findMany(),
      gifts: await prisma.gift.findMany(),
      replacements: await prisma.replacement.findMany(),
      expenses: await prisma.expense.findMany(),
      cashRegisters: await prisma.cashRegister.findMany(),
      cashMovements: await prisma.cashMovement.findMany(),
      timestamp: new Date().toISOString()
    };

    const jsonContent = JSON.stringify(data, null, 2);
    const base64Content = Buffer.from(jsonContent).toString('base64');
    const path = 'database-backup.json';

    // 4. Push to GitHub
    console.log('Pushing to GitHub...');
    const githubApiUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${path}`;
    
    // First, check if the file already exists to get its SHA (required for updating)
    let sha = undefined;
    const getRes = await fetch(githubApiUrl, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Gujarat-Mobile-Backup'
      }
    });

    if (getRes.ok) {
      const getJson = await getRes.json();
      sha = getJson.sha;
    }

    // Create or update the file
    const putRes = await fetch(githubApiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Gujarat-Mobile-Backup',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Automated database backup - ${new Date().toISOString()}`,
        content: base64Content,
        sha: sha
      })
    });

    if (!putRes.ok) {
      const errorText = await putRes.text();
      console.error('GitHub API error:', errorText);
      return NextResponse.json({ error: 'Failed to push to GitHub', details: errorText }, { status: 500 });
    }

    console.log('Backup successful!');
    return NextResponse.json({ success: true, message: 'Backup completed successfully' });
  } catch (error: any) {
    console.error('Backup error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
