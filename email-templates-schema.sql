-- Create email_templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id VARCHAR(50) PRIMARY KEY,
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default templates
INSERT INTO email_templates (id, subject, body, description) VALUES
(
  'class_reminder',
  'Reminder: Your {{course_name}} class starts soon',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
    <div style="background-color: #6200ea; padding: 15px; border-radius: 5px 5px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 24px;">Class Reminder</h1>
    </div>
    <div style="padding: 20px;">
      <p>Hello {{user_name}},</p>
      <p>This is a reminder that your class <strong>{{class_title}}</strong> for <strong>{{course_name}}</strong> starts in <strong>{{minutes_until}} minutes</strong>.</p>
      <p><strong>Date:</strong> {{class_date}}<br>
      <strong>Time:</strong> {{class_time}}</p>
      {{#if meeting_link}}
      <p>You can join the class using this link: <a href="{{meeting_link}}" style="color: #6200ea;">Join Class</a></p>
      {{/if}}
      <p>Please make sure you are prepared and ready to join the session on time.</p>
      <p>Best regards,<br>UniSync Team</p>
    </div>
    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 0 0 5px 5px; font-size: 12px; color: #666;">
      <p>This is an automated message from UniSync. Please do not reply to this email.</p>
    </div>
  </div>',
  'Email template for class session reminders'
),
(
  'announcement',
  '{{announcement_title}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
    <div style="background-color: #6200ea; padding: 15px; border-radius: 5px 5px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 24px;">Announcement</h1>
    </div>
    <div style="padding: 20px;">
      <p>Hello {{user_name}},</p>
      <h2 style="color: #6200ea; margin-top: 20px;">{{announcement_title}}</h2>
      <div style="border-left: 4px solid #6200ea; padding-left: 15px; margin: 20px 0;">
        {{announcement_content}}
      </div>
      <p style="margin-top: 20px;">From: {{sender_name}}</p>
      <p>Best regards,<br>UniSync Team</p>
    </div>
    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 0 0 5px 5px; font-size: 12px; color: #666;">
      <p>This is an automated message from UniSync. Please do not reply to this email.</p>
    </div>
  </div>',
  'Email template for announcements'
),
(
  'password_reset',
  'Reset Your UniSync Password',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
    <div style="background-color: #6200ea; padding: 15px; border-radius: 5px 5px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 24px;">Password Reset</h1>
    </div>
    <div style="padding: 20px;">
      <p>Hello {{user_name}},</p>
      <p>We received a request to reset your password for your UniSync account. If you did not make this request, you can safely ignore this email.</p>
      <p>To reset your password, click the button below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{reset_link}}" style="background-color: #6200ea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
      </div>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #6200ea;">{{reset_link}}</p>
      <p>This link will expire in 1 hour.</p>
      <p>Best regards,<br>UniSync Team</p>
    </div>
    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 0 0 5px 5px; font-size: 12px; color: #666;">
      <p>This is an automated message from UniSync. Please do not reply to this email.</p>
    </div>
  </div>',
  'Email template for password reset requests'
),
(
  'welcome',
  'Welcome to UniSync!',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
    <div style="background-color: #6200ea; padding: 15px; border-radius: 5px 5px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to UniSync!</h1>
    </div>
    <div style="padding: 20px;">
      <p>Hello {{user_name}},</p>
      <p>Welcome to UniSync, your unified university communication hub! We''re excited to have you join our platform.</p>
      <p>Your account has been created successfully. Here are your account details:</p>
      <ul>
        <li><strong>Email:</strong> {{user_email}}</li>
        <li><strong>Role:</strong> {{user_role}}</li>
      </ul>
      <p>To get started, please verify your email by clicking the button below:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{verification_link}}" style="background-color: #6200ea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email</a>
      </div>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #6200ea;">{{verification_link}}</p>
      <p>Once verified, you can log in and start using all the features UniSync has to offer.</p>
      <p>Best regards,<br>UniSync Team</p>
    </div>
    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 0 0 5px 5px; font-size: 12px; color: #666;">
      <p>This is an automated message from UniSync. Please do not reply to this email.</p>
    </div>
  </div>',
  'Welcome email for new users'
),
(
  'grade_update',
  'Grade Update for {{course_name}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
    <div style="background-color: #6200ea; padding: 15px; border-radius: 5px 5px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 24px;">Grade Update</h1>
    </div>
    <div style="padding: 20px;">
      <p>Hello {{user_name}},</p>
      <p>A new grade has been posted for <strong>{{course_name}}</strong>.</p>
      <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Assignment:</strong> {{assignment_name}}</p>
        <p><strong>Grade:</strong> {{grade}}</p>
        {{#if comments}}
        <p><strong>Comments:</strong> {{comments}}</p>
        {{/if}}
      </div>
      <p>You can view more details by logging into your UniSync account.</p>
      <p>Best regards,<br>UniSync Team</p>
    </div>
    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 0 0 5px 5px; font-size: 12px; color: #666;">
      <p>This is an automated message from UniSync. Please do not reply to this email.</p>
    </div>
  </div>',
  'Email template for grade updates'
);
