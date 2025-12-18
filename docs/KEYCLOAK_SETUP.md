# Keycloak Authentication Integration

This project has been migrated from JWT-based authentication to **Keycloak** for enterprise-grade authentication and authorization.

## Setup Instructions

### 1. Start Keycloak

Use the provided Docker Compose file to start Keycloak:

```bash
docker-compose -f docker-compose-keycloak.yml up -d
```

Keycloak will be available at: `http://localhost:8080`

**Default admin credentials:**
- Username: `admin`
- Password: `admin`

### 2. Configure Keycloak

#### Create a Realm (Optional)
1. Login to Keycloak admin console at `http://localhost:8080`
2. Create a new realm or use the `master` realm
3. Note the realm name for your `.env` configuration

#### Create a Client
1. Go to **Clients** → **Create Client**
2. Set the following:
   - **Client ID**: `sef-app` (or your preferred client ID)
   - **Client Protocol**: `openid-connect`
   - **Access Type**: `confidential`
3. Click **Save**
4. In the **Settings** tab:
   - **Valid Redirect URIs**: `http://localhost:3000/auth/callback`
   - **Web Origins**: `http://localhost:3000`
   - **Valid Post Logout Redirect URIs**: `http://localhost:3000`
5. Go to **Credentials** tab and copy the **Client Secret**

#### Create Roles
1. Go to **Realm Roles** → **Create Role**
2. Create an `admin` role for super administrators
3. Create additional roles as needed (e.g., `user`)

#### Create Users
1. Go to **Users** → **Add User**
2. Fill in user details (username, email, first name, last name)
3. In **Attributes** tab, you can add:
   - `locale`: `en` or `tr` (for language preference)
4. Go to **Credentials** tab to set password
5. Go to **Role Mappings** tab to assign roles (e.g., `admin`)

### 3. Configure Backend

1. Copy the example environment file:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. Update `.env` with your Keycloak configuration:
   ```env
   KEYCLOAK_URL=http://localhost:8080
   KEYCLOAK_REALM=master
   KEYCLOAK_CLIENT_ID=sef-app
   KEYCLOAK_CLIENT_SECRET=<your-client-secret-from-keycloak>
   KEYCLOAK_REDIRECT_URL=http://localhost:3000/auth/callback
   ```

3. Run database migrations:
   ```bash
   go run cmd/server/main.go
   ```
   The application will automatically migrate the database schema.

### 4. Start the Application

**Backend:**
```bash
cd backend
go run cmd/server/main.go
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### 5. Login

1. Navigate to `http://localhost:3000/auth/login`
2. Click "Keycloak ile Giriş Yap" (Login with Keycloak)
3. You will be redirected to Keycloak login page
4. Enter your credentials
5. After successful authentication, you'll be redirected back to the application

## User Attributes in Keycloak

The application syncs the following attributes from Keycloak:

- **Sub (Subject)**: Keycloak user ID (stored as `keycloak_id`)
- **Preferred Username**: Username
- **Name**: Full name
- **Email**: Email address
- **Locale**: Language preference (`en` or `tr`)
- **Roles**: User roles (specifically the `admin` role)

## Role-Based Access Control

- **Admin Role**: Users with the `admin` role in Keycloak will have `is_admin=true` in the database
- **Protected Routes**: Routes that require admin access use the `IsSuperAdmin()` middleware
- **Role Sync**: Admin status is automatically synced on every authenticated request

## Token Management

- **Access Token**: Short-lived token for API authentication (stored in HTTP-only cookie)
- **Refresh Token**: Long-lived token for obtaining new access tokens (stored in HTTP-only cookie)
- **Automatic Refresh**: The middleware automatically refreshes expired access tokens using the refresh token
- **Logout**: Server-side logout invalidates both tokens in Keycloak

## Security Features

- HTTP-only cookies prevent XSS attacks
- SameSite=None with Secure flag for CORS support
- State parameter for CSRF protection in OAuth flow
- Token verification with Keycloak on every request
- Automatic token refresh on expiration

## Production Deployment

For production deployment:

1. Use HTTPS for all services
2. Update `KEYCLOAK_URL` to your production Keycloak instance
3. Update `KEYCLOAK_REDIRECT_URL` to your production frontend URL
4. Use a proper database (not the default Docker database)
5. Change all default passwords and secrets
6. Configure Keycloak with proper SSL certificates
7. Set up proper session management and security settings in Keycloak
8. Enable account verification and password policies in Keycloak

## Troubleshooting

### "Unauthorized" error on login
- Check that Keycloak is running and accessible
- Verify `KEYCLOAK_URL` in `.env` is correct
- Ensure the client ID and secret match Keycloak configuration

### Redirect loop
- Check that `KEYCLOAK_REDIRECT_URL` matches the Valid Redirect URI in Keycloak
- Verify cookies are being set correctly (check browser developer tools)

### Token validation fails
- Ensure the access token is being sent in the cookie
- Check that the Keycloak realm and client are configured correctly
- Verify the client secret is correct

### User not created in database
- Check database connection and migrations
- Verify the user exists in Keycloak
- Check backend logs for errors during user creation