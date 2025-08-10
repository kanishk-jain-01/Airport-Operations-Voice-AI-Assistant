# SSM Parameter for OpenAI API Key
resource "aws_ssm_parameter" "openai_api_key" {
  name  = "/${var.project_name}/openai-api-key"
  type  = "SecureString"
  value = var.openai_api_key

  tags = {
    Name = "${local.name_prefix}-openai-api-key"
  }
}

# SSM Parameter for Picovoice Access Key (optional)
resource "aws_ssm_parameter" "picovoice_access_key" {
  count = var.picovoice_access_key != "" ? 1 : 0
  
  name  = "/${var.project_name}/picovoice-access-key"
  type  = "SecureString"
  value = var.picovoice_access_key

  tags = {
    Name = "${local.name_prefix}-picovoice-access-key"
  }
}
