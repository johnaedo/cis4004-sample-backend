export const checkRequiredEnv = () => {
    const required = [
      'NODE_ENV',
      'MONGODB_URI',
      'JWT_SECRET',
      'PORT'
    ];

    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
      console.error('Missing required environment variables:', missing.join(', '));
      process.exit(1);
    }

    // Check database configuration
    const dbConfigured = !!(
      process.env.MONGODB_URI
    );

    if (!dbConfigured) {
      console.error('No valid database configuration found');
      process.exit(1);
    }

    console.log('Environment check passed');
    console.log(`MongoDB URI: ${process.env.MONGODB_URI}`);
    console.log('Environment:', process.env.NODE_ENV);
  };
