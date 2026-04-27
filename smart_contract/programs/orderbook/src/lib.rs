
use anchor_lang::prelude::*;
declare_id!("Dt5N4RsBurrVSfFqNxsbBtNKfodYFSHtsCCXYjh9dsdZ");

#[program]
pub mod user {
    use super::*;

    pub fn create_profile(
        ctx: Context<CreateProfile>,
        name: String,
        email: String,
        phone: String,
    ) -> Result<()> {
        require!(name.len() <= 50, AppError::NameTooLong);
        require!(email.len() <= 50, AppError::EmailTooLong);
        require!(phone.len() <= 20, AppError::PhoneTooLong);

        let profile = &mut ctx.accounts.profile;
        profile.owner = ctx.accounts.user.key();
        profile.name = name;
        profile.email = email;
        profile.phone = phone;
        Ok(())
    }

    pub fn update_profile(
        ctx: Context<UpdateProfile>,
        name: String,
        email: String,
        phone: String,
    ) -> Result<()> {
        require!(name.len() <= 50, AppError::NameTooLong);
        require!(email.len() <= 50, AppError::EmailTooLong);
        require!(phone.len() <= 20, AppError::PhoneTooLong);

        let profile = &mut ctx.accounts.profile;
        profile.name = name;
        profile.email = email;
        profile.phone = phone;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateProfile<'info> {
    #[account(
        init,
        payer = user,
        space = UserProfile::LEN,
        seeds = [b"profile", user.key().as_ref()],
        bump
    )]
    pub profile: Account<'info, UserProfile>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateProfile<'info> {
    #[account(
        mut,
        seeds = [b"profile", user.key().as_ref()],
        bump
    )]
    pub profile: Account<'info, UserProfile>,

    #[account(mut)]
    pub user: Signer<'info>,
}

#[account]
pub struct UserProfile {
    pub owner: Pubkey,  // 32
    pub name: String,   // 4 + 50
    pub email: String,  // 4 + 50
    pub phone: String,  // 4 + 20
}

impl UserProfile {
    pub const LEN: usize = 8      // anchor discriminator
        + 32                      // owner
        + 4 + 50                  // name
        + 4 + 50                  // email
        + 4 + 20;                 // phone
}

#[error_code]
pub enum AppError {
    #[msg("Name must be 50 characters or less")]
    NameTooLong,
    #[msg("Email must be 50 characters or less")]
    EmailTooLong,
    #[msg("Phone must be 20 characters or less")]
    PhoneTooLong,
    #[msg("You are not the profile owner")]
    Unauthorized,
}