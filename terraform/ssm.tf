# SSM Parameter for OpenAI API Key
resource "aws_ssm_parameter" "openai_api_key" {
  name  = "/${var.project_name}/openai-api-key"
  type  = "SecureString"
  value = var.openai_api_key

  tags = {
    Name = "${local.name_prefix}-openai-api-key"
  }
}

# Note: Picovoice SSM parameter removed - wake word detection now uses Web Speech API
