use anchor_lang::prelude::*;

declare_id!("DmoGmVxSDLUE2CNfRExb1dsTvWkz3afXSt6veumWEi2A");

#[program]
pub mod on_chain_data {
    use super::*;

    
    pub fn store_user_info(
        ctx: Context<StoreUserInfo>,
        name: String,
        email: String,
        phone_number: String,
    ) -> Result<()> {
        require!(name.len() <= 50, UserInfoError::NameTooLong);
        require!(email.len() <= 100, UserInfoError::EmailTooLong);
        require!(phone_number.len() <= 15, UserInfoError::PhoneTooLong);

        let user_info = &mut ctx.accounts.user_info;
        user_info.owner = ctx.accounts.user.key();
        user_info.name = name;
        user_info.email = email;
        user_info.phone_number = phone_number;
        user_info.timestamp = Clock::get()?.unix_timestamp;
        user_info.bump = ctx.bumps.user_info;

        msg!("User info stored for: {}", user_info.owner);
        Ok(())
    }

    pub fn update_user_info(
        ctx: Context<UpdateUserInfo>,
        name: String,
        email: String,
        phone_number: String,
    ) -> Result<()> {
        require!(name.len() <= 50, UserInfoError::NameTooLong);
        require!(email.len() <= 100, UserInfoError::EmailTooLong);
        require!(phone_number.len() <= 15, UserInfoError::PhoneTooLong);

        let user_info = &mut ctx.accounts.user_info;
        user_info.name = name;
        user_info.email = email;
        user_info.phone_number = phone_number;
        user_info.timestamp = Clock::get()?.unix_timestamp;

        msg!("User info updated for: {}", user_info.owner);
        Ok(())
    }
}


#[derive(Accounts)]
pub struct StoreUserInfo<'info> {
    #[account(
        init,
        payer = user,
        space = UserInfo::LEN,
        seeds = [b"user-info", user.key().as_ref()],
        bump
    )]
    pub user_info: Account<'info, UserInfo>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateUserInfo<'info> {
    #[account(
        mut,
        seeds = [b"user-info", user.key().as_ref()],
        bump = user_info.bump,
        has_one = owner @ UserInfoError::Unauthorized,
    )]
    pub user_info: Account<'info, UserInfo>,

    #[account(mut)]
    pub user: Signer<'info>,

    /// CHECK: validated via has_one
    pub owner: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
pub struct UserInfo {
    pub owner: Pubkey,        // 32
    pub name: String,         // 4 + 50
    pub email: String,        // 4 + 100
    pub phone_number: String, // 4 + 15
    pub timestamp: i64,       // 8
    pub bump: u8,             // 1
}

impl UserInfo {
    pub const LEN: usize = 8   // discriminator
        + 32                   // owner
        + 4 + 50               // name
        + 4 + 100              // email
        + 4 + 15               // phone_number
        + 8                    // timestamp
        + 1;                   // bump
}

#[error_code]
pub enum UserInfoError {
    #[msg("Name must be 50 characters or less")]
    NameTooLong,
    #[msg("Email must be 100 characters or less")]
    EmailTooLong,
    #[msg("Phone number must be 15 characters or less")]
    PhoneTooLong,
    #[msg("Unauthorized")]
    Unauthorized,
}